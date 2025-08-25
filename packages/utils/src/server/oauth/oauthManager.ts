/**
 * OAuth Manager - Simplified with openid-client
 * openid-clientの機能を最大限活用した簡潔な実装
 */

import * as client from "openid-client";

import { db } from "@tumiki/db/server";

import type { OAuthAuthResult, OAuthConfig } from "./types.js";
import {
  getExistingConfiguration,
  performDynamicClientRegistration,
} from "./dcrClient.js";
import {
  buildRedirectUri,
  createOAuthError,
  generateSessionId,
  OAuthErrorCodes,
} from "./minimalUtils.js";
import { saveToken } from "./tokenManager.js";

// デフォルト設定
const DEFAULT_CONFIG: OAuthConfig = {
  callbackBaseUrl:
    process.env.OAUTH_CALLBACK_BASE_URL ?? "http://localhost:8080",
  sessionTimeout: 600,
  tokenRefreshBuffer: 300,
  maxRetries: 3,
  retryDelay: 1000,
  enablePKCE: true,
  enableDCR: true,
};

// Configurationキャッシュ
const configCache = new Map<string, client.Configuration>();

/**
 * OAuth認証フローを開始
 */
export const startOAuthFlow = async (
  mcpServerId: string,
  userId: string,
  mcpServerUrl: string,
  _wwwAuthenticateHeader?: string,
  config: Partial<OAuthConfig> = {},
): Promise<OAuthAuthResult> => {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    // Configuration取得または作成
    const clientConfig = await getOrCreateConfiguration(
      mcpServerId,
      mcpServerUrl,
      cfg.callbackBaseUrl,
      cfg.enableDCR === true,
    );

    // Authorization URL生成（openid-clientがPKCE対応を含めて処理）
    const redirectUri = buildRedirectUri(cfg.callbackBaseUrl, mcpServerId);
    const state = client.randomState();
    const nonce = client.randomNonce();

    const authUrlParams: Record<string, string> = {
      redirect_uri: redirectUri,
      scope: "openid profile email",
      state,
      nonce,
    };

    // PKCE対応
    let codeVerifier: string | undefined;
    if (cfg.enablePKCE) {
      codeVerifier = client.randomPKCECodeVerifier();
      authUrlParams.code_challenge =
        await client.calculatePKCECodeChallenge(codeVerifier);
      authUrlParams.code_challenge_method = "S256";
    }

    const authUrl = client.buildAuthorizationUrl(clientConfig, authUrlParams);

    // セッション保存
    await db.oAuthSession.create({
      data: {
        sessionId: generateSessionId(),
        userId,
        mcpServerId,
        state,
        nonce,
        codeVerifier: codeVerifier ?? "",
        codeChallenge: authUrlParams.code_challenge ?? "",
        codeChallengeMethod: cfg.enablePKCE ? "S256" : "",
        redirectUri,
        requestedScopes: ["openid", "profile", "email"],
        status: "pending",
        expiresAt: new Date(Date.now() + cfg.sessionTimeout * 1000),
      },
    });

    return {
      success: false,
      requiresUserInteraction: true,
      authorizationUrl: authUrl.href,
    };
  } catch (error) {
    return {
      success: false,
      error: createOAuthError(
        OAuthErrorCodes.SERVER_ERROR,
        error instanceof Error ? error.message : "OAuth flow failed",
      ),
    };
  }
};

/**
 * OAuthコールバックを処理
 */
export const handleOAuthCallback = async (
  code: string,
  state: string,
  error?: string,
  errorDescription?: string,
): Promise<OAuthAuthResult> => {
  if (error) {
    return {
      success: false,
      error: createOAuthError(error, errorDescription),
    };
  }

  try {
    // セッション取得
    const session = await db.oAuthSession.findFirst({
      where: { state, status: "pending" },
    });

    if (!session) {
      return {
        success: false,
        error: createOAuthError(
          OAuthErrorCodes.SESSION_EXPIRED,
          "Invalid session",
        ),
      };
    }

    // Configuration取得
    const clientConfig =
      configCache.get(session.mcpServerId) ??
      (await getExistingConfiguration(session.mcpServerId));

    if (!clientConfig) {
      throw new Error("Configuration not found");
    }

    // コールバックURL構築（現在のURL）
    const callbackUrl = new URL(session.redirectUri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);

    // openid-clientでトークン交換（検証を含む）
    const tokens = await client.authorizationCodeGrant(
      clientConfig,
      callbackUrl,
      {
        pkceCodeVerifier: session.codeVerifier || undefined,
        expectedNonce: session.nonce ?? undefined,
        expectedState: state,
      },
    );

    // トークン保存
    await saveTokenToDatabase(session.userId, session.mcpServerId, tokens);

    // セッション完了
    await db.oAuthSession.update({
      where: { id: session.id },
      data: { status: "completed" },
    });

    return {
      success: true,
      accessToken: tokens.access_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: createOAuthError(
        OAuthErrorCodes.SERVER_ERROR,
        error instanceof Error ? error.message : "Callback failed",
      ),
    };
  }
};

/**
 * トークンをリフレッシュ
 */
export const refreshOAuthToken = async (
  userMcpConfigId: string,
): Promise<string | null> => {
  try {
    const token = await db.oAuthToken.findFirst({
      where: { userMcpConfigId, isValid: true },
      include: { oauthClient: true },
    });

    if (!token?.refreshToken) return null;

    const clientConfig = await getExistingConfiguration(
      token.oauthClient.mcpServerId,
    );
    if (!clientConfig) return null;

    // openid-clientでリフレッシュ
    const newTokens = await client.refreshTokenGrant(
      clientConfig,
      token.refreshToken,
    );

    // 新トークン保存
    await saveToken(userMcpConfigId, token.oauthClientId, {
      access_token: newTokens.access_token,
      token_type: newTokens.token_type || "Bearer",
      expires_in: newTokens.expires_in,
      refresh_token: newTokens.refresh_token,
      id_token: newTokens.id_token,
      scope: newTokens.scope,
    });

    return newTokens.access_token;
  } catch (error) {
    console.error("Refresh failed:", error);
    return null;
  }
};

/**
 * トークンを無効化
 */
export const revokeOAuthToken = async (
  userMcpConfigId: string,
): Promise<void> => {
  try {
    const token = await db.oAuthToken.findFirst({
      where: { userMcpConfigId, isValid: true },
      include: { oauthClient: true },
    });

    if (!token) return;

    const clientConfig = await getExistingConfiguration(
      token.oauthClient.mcpServerId,
    );

    if (clientConfig && token.accessToken) {
      // openid-clientでrevoke（エラーは無視）
      await client
        .tokenRevocation(clientConfig, token.accessToken)
        .catch(() => {
          /* ignore errors */
        });
    }

    // DB無効化
    await db.oAuthToken.update({
      where: { id: token.id },
      data: { isValid: false },
    });
  } catch (error) {
    console.error("Revoke failed:", error);
  }
};

// ===== ヘルパー関数 =====

/**
 * Configuration取得または作成
 */
async function getOrCreateConfiguration(
  mcpServerId: string,
  mcpServerUrl: string,
  callbackBaseUrl: string,
  enableDCR: boolean,
): Promise<client.Configuration> {
  // キャッシュ確認
  const cached = configCache.get(mcpServerId);
  if (cached) return cached;

  // 既存のConfiguration取得を試みる
  let config = await getExistingConfiguration(mcpServerId);

  if (!config && enableDCR) {
    // DCR実行
    const result = await performDynamicClientRegistration(
      new URL(mcpServerUrl).origin,
      mcpServerId,
      buildRedirectUri(callbackBaseUrl, mcpServerId),
    );
    config = result.configuration;
  }

  if (!config) {
    throw new Error("Failed to get or create configuration");
  }

  configCache.set(mcpServerId, config);
  return config;
}

/**
 * トークンをDBに保存
 */
async function saveTokenToDatabase(
  userId: string,
  mcpServerId: string,
  tokens: client.TokenEndpointResponse,
): Promise<void> {
  // ユーザー設定取得/作成
  const userOrg = await db.organizationMember.findFirst({ where: { userId } });
  if (!userOrg) throw new Error("User org not found");

  let userConfig = await db.userMcpServerConfig.findFirst({
    where: { organizationId: userOrg.organizationId, mcpServerId },
  });

  userConfig ??= await db.userMcpServerConfig.create({
    data: {
      organizationId: userOrg.organizationId,
      mcpServerId,
      name: "OAuth Configuration",
      description: "Auto-created OAuth configuration",
      envVars: "",
    },
  });

  const oauthClient = await db.oAuthClient.findUnique({
    where: { mcpServerId },
  });
  if (!oauthClient) throw new Error("OAuth client not found");

  await saveToken(userConfig.id, oauthClient.id, {
    access_token: tokens.access_token,
    token_type: tokens.token_type || "Bearer",
    expires_in: tokens.expires_in,
    refresh_token: tokens.refresh_token,
    id_token: tokens.id_token,
    scope: tokens.scope,
  });
}

/**
 * 設定検証
 */
export const validateOAuthConfig = (
  config: Partial<OAuthConfig>,
): OAuthConfig => {
  return { ...DEFAULT_CONFIG, ...config };
};
