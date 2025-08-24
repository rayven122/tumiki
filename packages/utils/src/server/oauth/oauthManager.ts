/**
 * OAuth Manager
 * OAuth認証フロー全体の制御と管理
 */

import { db } from "@tumiki/db/server";

import type {
  AuthServerMetadata,
  OAuthAuthResult,
  OAuthConfig,
  TokenResponse,
  WWWAuthenticateChallenge,
} from "./types.js";
import {
  discoverAuthServer,
  discoverProtectedResource,
  parseWWWAuthenticate,
  registerClient,
} from "./dcrClient.js";
import {
  getValidToken,
  refreshToken as refreshTokenUtil,
  revokeToken as revokeTokenUtil,
  saveToken,
} from "./tokenManager.js";
import {
  buildAuthorizationUrl,
  buildRedirectUri,
  buildTokenRequestBody,
  calculateTokenExpiry,
  createBasicAuthHeader,
  createOAuthError,
  generateNonce,
  generatePKCE,
  generateSessionId,
  generateState,
  isSessionValid,
  logOAuthFlow,
  OAuthErrorCodes,
  validateTokenResponse,
} from "./utils.js";

/**
 * デフォルト設定
 */
const DEFAULT_SESSION_TIMEOUT = 600; // 10 minutes
const DEFAULT_TOKEN_REFRESH_BUFFER = 300; // 5 minutes
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * 設定の初期化
 */
const initializeConfig = (config: Partial<OAuthConfig>): OAuthConfig => ({
  callbackBaseUrl: config.callbackBaseUrl ?? "",
  sessionTimeout: config.sessionTimeout ?? DEFAULT_SESSION_TIMEOUT,
  tokenRefreshBuffer: config.tokenRefreshBuffer ?? DEFAULT_TOKEN_REFRESH_BUFFER,
  maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
  retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
  enablePKCE: config.enablePKCE ?? true,
  enableDCR: config.enableDCR ?? true,
});

/**
 * 認証コードをトークンに交換
 */
const exchangeCodeForToken = async (
  tokenEndpoint: string,
  body: URLSearchParams,
  clientId: string,
  clientSecret?: string,
): Promise<TokenResponse> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  // Basic認証ヘッダーを追加（client_secret_basicの場合）
  if (clientSecret) {
    headers.Authorization = createBasicAuthHeader(clientId, clientSecret);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEFAULT_REQUEST_TIMEOUT,
  );

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers,
      body: body.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        error: "invalid_grant",
        error_description: `HTTP ${response.status} ${response.statusText}`,
      }))) as { error?: string; error_description?: string };

      throw new Error(
        errorData.error_description ??
          errorData.error ??
          "Token exchange failed",
      );
    }

    const tokenResponse = (await response.json()) as TokenResponse;
    return tokenResponse;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * OAuth認証フローを開始
 */
export const authenticate = async (
  mcpServerId: string,
  userId: string,
  mcpServerUrl: string,
  wwwAuthenticateHeader?: string,
  config: Partial<OAuthConfig> = {},
): Promise<OAuthAuthResult> => {
  const oauthConfig = initializeConfig(config);

  try {
    logOAuthFlow("Starting OAuth authentication", {
      mcpServerId,
      userId,
      mcpServerUrl,
    });

    // 既存のOAuthクライアント情報を取得
    let oauthClient = await db.oAuthClient.findUnique({
      where: { mcpServerId },
    });

    // 既存のクライアントがある場合、先に有効なトークンをチェック
    if (oauthClient) {
      // ユーザーのMCPサーバー設定を確認
      const userOrganization = await db.organizationMember.findFirst({
        where: { userId },
        include: { organization: true },
      });

      let userMcpConfig = null;
      if (userOrganization) {
        userMcpConfig = await db.userMcpServerConfig.findFirst({
          where: {
            organizationId: userOrganization.organizationId,
            mcpServerId: mcpServerId,
          },
        });
      }

      // 既存の有効なトークンをチェック
      if (userMcpConfig) {
        const existingToken = await getValidToken(userMcpConfig.id, {
          tokenRefreshBuffer: oauthConfig.tokenRefreshBuffer,
        });

        if (existingToken) {
          logOAuthFlow("Using existing valid token", { mcpServerId });
          return {
            success: true,
            accessToken: existingToken,
          };
        }
      }
    }

    // Authorization Server情報を取得（新規クライアント登録または新規認証の場合）
    let authServerMetadata: AuthServerMetadata | null = null;
    let authServerUrl: string | undefined;

    // WWW-Authenticateヘッダーがある場合はパース
    if (wwwAuthenticateHeader) {
      const challenge = parseWWWAuthenticate(wwwAuthenticateHeader);
      authServerUrl = challenge.as_uri;
    }

    // Protected Resource Metadataを取得
    const protectedResourceMetadata =
      await discoverProtectedResource(mcpServerUrl);
    if (protectedResourceMetadata?.authorization_servers?.[0]) {
      authServerUrl =
        authServerUrl ?? protectedResourceMetadata.authorization_servers[0];
    }

    // Authorization Server Metadataを取得
    if (authServerUrl) {
      authServerMetadata = await discoverAuthServer(authServerUrl);
    }

    if (!authServerMetadata) {
      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.DISCOVERY_FAILED,
          "Failed to discover authorization server",
        ),
        requiresUserInteraction: false,
      };
    }

    // Dynamic Client Registrationを実行（必要な場合）
    if (!oauthClient && oauthConfig.enableDCR) {
      if (!authServerMetadata.registration_endpoint) {
        return {
          success: false,
          error: createOAuthError(
            OAuthErrorCodes.DCR_FAILED,
            "DCR endpoint not available",
          ),
          requiresUserInteraction: false,
        };
      }

      const redirectUri = buildRedirectUri(
        oauthConfig.callbackBaseUrl,
        mcpServerId,
      );

      const clientCredentials = await registerClient(
        authServerMetadata.registration_endpoint,
        {
          redirect_uris: [redirectUri],
          client_name: `tumiki MCP Client for ${mcpServerId}`,
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_basic",
          scope: protectedResourceMetadata?.scopes_supported?.join(" ") ?? "",
          mcp_server_id: mcpServerId,
          mcp_server_name: mcpServerUrl,
        },
      );

      // OAuthクライアント情報を保存
      oauthClient = await db.oAuthClient.create({
        data: {
          mcpServerId,
          clientId: clientCredentials.client_id,
          clientSecret: clientCredentials.client_secret,
          registrationAccessToken:
            clientCredentials.registration_access_token ?? null,
          registrationClientUri:
            clientCredentials.registration_client_uri ?? null,
          authorizationServerUrl: authServerUrl ?? "",
          tokenEndpoint: authServerMetadata.token_endpoint,
          authorizationEndpoint: authServerMetadata.authorization_endpoint,
          registrationEndpoint: authServerMetadata.registration_endpoint,
          jwksUri: authServerMetadata.jwks_uri,
          revocationEndpoint: authServerMetadata.revocation_endpoint,
          introspectionEndpoint: authServerMetadata.introspection_endpoint,
          protectedResourceUrl: mcpServerUrl,
          resourceIndicator: protectedResourceMetadata?.resource,
          scopes:
            clientCredentials.scope?.split(" ") ??
            protectedResourceMetadata?.scopes_supported ??
            [],
          grantTypes: clientCredentials.grant_types ?? ["authorization_code"],
          responseTypes: clientCredentials.response_types ?? ["code"],
          tokenEndpointAuthMethod:
            clientCredentials.token_endpoint_auth_method ??
            "client_secret_basic",
          redirectUris: clientCredentials.redirect_uris,
          applicationName: clientCredentials.client_name,
          applicationUri: clientCredentials.client_uri,
          logoUri: clientCredentials.logo_uri,
        },
      });

      logOAuthFlow("OAuth client registered", {
        clientId: oauthClient.clientId,
        mcpServerId,
      });
    }

    if (!oauthClient) {
      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.DCR_FAILED,
          "Failed to register OAuth client",
        ),
        requiresUserInteraction: false,
      };
    }

    // OAuth認証セッションを作成
    const sessionId = generateSessionId();
    const pkce = oauthConfig.enablePKCE ? generatePKCE() : null;
    const state = generateState();
    const nonce = generateNonce();
    const redirectUri = buildRedirectUri(
      oauthConfig.callbackBaseUrl,
      mcpServerId,
    );

    await db.oAuthSession.create({
      data: {
        sessionId,
        userId,
        mcpServerId,
        codeVerifier: pkce?.codeVerifier ?? "",
        codeChallenge: pkce?.codeChallenge ?? "",
        codeChallengeMethod: pkce?.codeChallengeMethod ?? "S256",
        state,
        nonce,
        redirectUri,
        requestedScopes: oauthClient.scopes,
        status: "pending",
        expiresAt: new Date(Date.now() + oauthConfig.sessionTimeout * 1000),
      },
    });

    // 認証URLを構築
    const authorizationUrl = buildAuthorizationUrl(
      oauthClient.authorizationEndpoint,
      {
        client_id: oauthClient.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: oauthClient.scopes.join(" "),
        state,
        ...(pkce && {
          code_challenge: pkce.codeChallenge,
          code_challenge_method: pkce.codeChallengeMethod,
        }),
        ...(nonce && { nonce }),
        ...(oauthClient.resourceIndicator && {
          resource: oauthClient.resourceIndicator,
        }),
      },
    );

    logOAuthFlow("OAuth session created", {
      sessionId,
      authorizationUrl,
    });

    return {
      success: false,
      requiresUserInteraction: true,
      authorizationUrl,
    };
  } catch (error) {
    console.error("OAuth authentication failed", {
      mcpServerId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: createOAuthError(
        OAuthErrorCodes.SERVER_ERROR,
        error instanceof Error ? error.message : "Unknown error",
      ),
      requiresUserInteraction: false,
    };
  }
};

/**
 * OAuth認証コールバックを処理
 */
export const handleCallback = async (
  code: string,
  state: string,
  _config: Partial<OAuthConfig> = {},
  error?: string,
  errorDescription?: string,
): Promise<OAuthAuthResult> => {
  try {
    logOAuthFlow("Handling OAuth callback", {
      hasCode: !!code,
      state,
      error,
    });

    // エラーレスポンスの処理
    if (error) {
      return {
        success: false,
        error: createOAuthError(error, errorDescription),
        requiresUserInteraction: false,
      };
    }

    // セッションを取得
    const session = await db.oAuthSession.findFirst({
      where: { state },
      include: {
        user: true,
      },
    });

    if (!session) {
      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.SESSION_EXPIRED,
          "OAuth session not found or expired",
        ),
        requiresUserInteraction: false,
      };
    }

    // セッションの有効性をチェック
    if (
      !isSessionValid({
        expiresAt: session.expiresAt,
        status: session.status,
      })
    ) {
      await db.oAuthSession.update({
        where: { id: session.id },
        data: {
          status: "expired",
          errorCode: OAuthErrorCodes.SESSION_EXPIRED,
          errorDescription: "Session expired",
        },
      });

      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.SESSION_EXPIRED,
          "OAuth session expired",
        ),
        requiresUserInteraction: false,
      };
    }

    // OAuthクライアント情報を取得
    const oauthClient = await db.oAuthClient.findUnique({
      where: { mcpServerId: session.mcpServerId },
    });

    if (!oauthClient) {
      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.INVALID_CLIENT,
          "OAuth client not found",
        ),
        requiresUserInteraction: false,
      };
    }

    // トークンエンドポイントにリクエスト
    const tokenRequestBody = buildTokenRequestBody({
      grant_type: "authorization_code",
      code,
      redirect_uri: session.redirectUri,
      client_id: oauthClient.clientId,
      client_secret: oauthClient.clientSecret ?? undefined,
      code_verifier: session.codeVerifier || undefined,
    });

    const tokenResponse = await exchangeCodeForToken(
      oauthClient.tokenEndpoint,
      tokenRequestBody,
      oauthClient.clientId,
      oauthClient.clientSecret ?? undefined,
    );

    // トークンレスポンスを検証
    if (!validateTokenResponse(tokenResponse)) {
      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.INVALID_GRANT,
          "Invalid token response",
        ),
        requiresUserInteraction: false,
      };
    }

    // ユーザーのMCPサーバー設定を取得または作成
    const userOrganization = await db.organizationMember.findFirst({
      where: { userId: session.userId },
      include: { organization: true },
    });

    let userMcpConfig = null;
    if (userOrganization) {
      userMcpConfig = await db.userMcpServerConfig.findFirst({
        where: {
          organizationId: userOrganization.organizationId,
          mcpServerId: session.mcpServerId,
        },
      });
    }

    if (!userMcpConfig) {
      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.INVALID_REQUEST,
          "User MCP configuration not found",
        ),
        requiresUserInteraction: false,
      };
    }

    // トークンを保存
    await saveToken({
      userMcpConfigId: userMcpConfig.id,
      oauthClientId: oauthClient.id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      idToken: tokenResponse.id_token,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope,
      expiresAt: tokenResponse.expires_in
        ? calculateTokenExpiry(tokenResponse.expires_in)
        : undefined,
      refreshExpiresAt: tokenResponse.refresh_expires_in
        ? calculateTokenExpiry(tokenResponse.refresh_expires_in)
        : undefined,
    });

    // セッションを完了状態に更新
    await db.oAuthSession.update({
      where: { id: session.id },
      data: {
        status: "completed",
      },
    });

    logOAuthFlow("OAuth callback processed successfully", {
      sessionId: session.sessionId,
      hasRefreshToken: !!tokenResponse.refresh_token,
    });

    return {
      success: true,
      accessToken: tokenResponse.access_token,
      expiresAt: tokenResponse.expires_in
        ? calculateTokenExpiry(tokenResponse.expires_in)
        : undefined,
    };
  } catch (error) {
    console.error("OAuth callback processing failed", {
      state,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: createOAuthError(
        OAuthErrorCodes.SERVER_ERROR,
        error instanceof Error ? error.message : "Unknown error",
      ),
      requiresUserInteraction: false,
    };
  }
};

/**
 * トークンをリフレッシュ
 */
export const refreshToken = async (
  tokenId: string,
  config: Partial<OAuthConfig> = {},
): Promise<string> => {
  const oauthConfig = initializeConfig(config);

  try {
    logOAuthFlow("Refreshing OAuth token", { tokenId });

    const newToken = await refreshTokenUtil(tokenId, {
      maxRetries: oauthConfig.maxRetries,
      retryDelay: oauthConfig.retryDelay,
    });

    if (!newToken) {
      throw new Error("Failed to refresh token");
    }

    logOAuthFlow("OAuth token refreshed successfully", { tokenId });
    return newToken;
  } catch (error) {
    console.error("Token refresh failed", {
      tokenId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * トークンを無効化
 */
export const revokeToken = async (tokenId: string): Promise<void> => {
  try {
    logOAuthFlow("Revoking OAuth token", { tokenId });

    await revokeTokenUtil(tokenId);

    logOAuthFlow("OAuth token revoked successfully", { tokenId });
  } catch (error) {
    console.error("Token revocation failed", {
      tokenId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * WWW-Authenticateチャレンジを処理
 */
export const handleWWWAuthenticateChallenge = async (
  challenge: WWWAuthenticateChallenge,
  mcpServerId: string,
  userId: string,
  mcpServerUrl: string,
  config: Partial<OAuthConfig> = {},
): Promise<OAuthAuthResult> => {
  logOAuthFlow("Handling WWW-Authenticate challenge", {
    scheme: challenge.scheme,
    realm: challenge.realm,
    hasAsUri: !!challenge.as_uri,
  });

  // Bearer認証の場合のみ処理
  if (challenge.scheme.toLowerCase() !== "bearer") {
    return {
      success: false,
      error: createOAuthError(
        OAuthErrorCodes.UNSUPPORTED_RESPONSE_TYPE,
        `Unsupported authentication scheme: ${challenge.scheme}`,
      ),
      requiresUserInteraction: false,
    };
  }

  // Authorization Server URIが提供されている場合
  if (challenge.as_uri || challenge.authorizationUri) {
    return authenticate(
      mcpServerId,
      userId,
      mcpServerUrl,
      `${challenge.scheme} as_uri="${challenge.as_uri ?? challenge.authorizationUri}"`,
      config,
    );
  }

  // エラーが含まれている場合
  if (challenge.error) {
    return {
      success: false,
      error: createOAuthError(
        challenge.error,
        challenge.error_description,
        challenge.error_uri,
      ),
      requiresUserInteraction: false,
    };
  }

  // 必要な情報が不足している場合
  return {
    success: false,
    error: createOAuthError(
      OAuthErrorCodes.INVALID_REQUEST,
      "Insufficient information in WWW-Authenticate header",
    ),
    requiresUserInteraction: false,
  };
};

/**
 * OAuthManagerの作成（後方互換性のため）
 */
export const createOAuthManager = (config: Partial<OAuthConfig>) => ({
  authenticate: (
    mcpServerId: string,
    userId: string,
    mcpServerUrl: string,
    wwwAuthenticateHeader?: string,
  ) =>
    authenticate(
      mcpServerId,
      userId,
      mcpServerUrl,
      wwwAuthenticateHeader,
      config,
    ),
  handleCallback: (
    code: string,
    state: string,
    error?: string,
    errorDescription?: string,
  ) => handleCallback(code, state, config, error, errorDescription),
  refreshToken: (tokenId: string) => refreshToken(tokenId, config),
  revokeToken: (tokenId: string) => revokeToken(tokenId),
  handleWWWAuthenticateChallenge: (
    challenge: WWWAuthenticateChallenge,
    mcpServerId: string,
    userId: string,
    mcpServerUrl: string,
  ) =>
    handleWWWAuthenticateChallenge(
      challenge,
      mcpServerId,
      userId,
      mcpServerUrl,
      config,
    ),
});
