import { z } from "zod";
import * as logger from "../shared/utils/logger";

/**
 * OIDCエンドポイント型（Discovery Document から解決）
 */
export type OidcEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  endSessionEndpoint?: string;
};

const oidcDiscoverySchema = z.object({
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  end_session_endpoint: z.string().url().optional(),
});

/**
 * OIDC Discovery Document からエンドポイントを取得
 */
export const resolveOidcEndpoints = async (
  issuer: string,
): Promise<OidcEndpoints> => {
  const discoveryUrl = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `OIDC Discovery に失敗しました（${response.status}）: ${discoveryUrl}`,
    );
  }
  const data = oidcDiscoverySchema.parse(await response.json());
  return {
    authorizationEndpoint: data.authorization_endpoint,
    tokenEndpoint: data.token_endpoint,
    endSessionEndpoint: data.end_session_endpoint,
  };
};

/**
 * Keycloak設定のスキーマ
 */
const keycloakConfigSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  redirectUri: z.string().min(1),
  endpoints: z
    .object({
      authorizationEndpoint: z.string().url(),
      tokenEndpoint: z.string().url(),
      endSessionEndpoint: z.string().url().optional(),
    })
    .optional(),
});

/**
 * Keycloak設定型
 */
export type KeycloakConfig = z.infer<typeof keycloakConfigSchema>;

/**
 * トークンレスポンスのスキーマ
 */
const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  // jackson OIDC ブリッジは refresh_token を返さないため optional
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
  expires_in: z.number().int().positive(),
  token_type: z.string().min(1),
});

/**
 * トークンレスポンス型
 */
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

/** fetchリクエストのタイムアウト（ミリ秒） */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * KeycloakClient型
 */
export type KeycloakClient = {
  generateAuthUrl: (params: { codeChallenge: string; state: string }) => string;
  exchangeCodeForToken: (params: {
    code: string;
    codeVerifier: string;
  }) => Promise<TokenResponse>;
  refreshToken: (refreshToken: string) => Promise<TokenResponse>;
  logout: (params: { refreshToken: string; idToken?: string }) => Promise<void>;
};

/**
 * Keycloakクライアントを作成
 */
export const createKeycloakClient = (
  config: KeycloakConfig,
): KeycloakClient => {
  const validated = keycloakConfigSchema.parse(config);
  const normalizedIssuer = validated.issuer.replace(/\/$/, "");

  // Discovery で解決済みのエンドポイントがあればそちらを優先、なければ Keycloak 形式にフォールバック
  const authorizationEndpoint =
    validated.endpoints?.authorizationEndpoint ??
    `${normalizedIssuer}/protocol/openid-connect/auth`;
  const tokenEndpoint =
    validated.endpoints?.tokenEndpoint ??
    `${normalizedIssuer}/protocol/openid-connect/token`;
  const endSessionEndpoint =
    validated.endpoints?.endSessionEndpoint ??
    `${normalizedIssuer}/protocol/openid-connect/logout`;

  /**
   * 認証URLを生成（OAuth 2.0 + PKCE）
   */
  const generateAuthUrl = (params: {
    codeChallenge: string;
    state: string;
  }): string => {
    const { codeChallenge, state } = params;
    const authUrl = new URL(authorizationEndpoint);

    authUrl.searchParams.set("client_id", validated.clientId);
    authUrl.searchParams.set("redirect_uri", validated.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email offline_access");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return authUrl.toString();
  };

  /**
   * 認可コードをアクセストークンと交換
   */
  const exchangeCodeForToken = async (params: {
    code: string;
    codeVerifier: string;
  }): Promise<TokenResponse> => {
    const { code, codeVerifier } = params;
    const tokenUrl = tokenEndpoint;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: validated.clientId,
        code,
        redirect_uri: validated.redirectUri,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      let body = "";
      try {
        body = await response.text();
      } catch {
        // レスポンスボディ読み取り失敗は無視
      }
      // レスポンスボディが長い場合は200文字に切り詰めてログ出力
      logger.error("Token exchange failed", {
        status: response.status,
        body: body.length > 200 ? `${body.slice(0, 200)}...(truncated)` : body,
      });
      throw new Error(`トークン取得に失敗しました（${response.status}）`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      logger.warn("Failed to parse token exchange response", {
        status: response.status,
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      throw new Error(
        `トークン取得に失敗しました（レスポンス解析エラー: ${response.status}）`,
      );
    }
    return tokenResponseSchema.parse(data);
  };

  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  const refreshToken = async (token: string): Promise<TokenResponse> => {
    const tokenUrl = tokenEndpoint;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: validated.clientId,
        refresh_token: token,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      let body = "";
      try {
        body = await response.text();
      } catch {
        // レスポンスボディ読み取り失敗は無視
      }
      // レスポンスボディが長い場合は200文字に切り詰めてログ出力
      logger.error("Token refresh failed", {
        status: response.status,
        body: body.length > 200 ? `${body.slice(0, 200)}...(truncated)` : body,
      });
      throw new Error(
        `トークンリフレッシュに失敗しました（${response.status}）`,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      logger.warn("Failed to parse token refresh response", {
        status: response.status,
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      throw new Error(
        `トークンリフレッシュに失敗しました（レスポンス解析エラー: ${response.status}）`,
      );
    }
    return tokenResponseSchema.parse(data);
  };

  /**
   * Keycloakからログアウト
   */
  const logout = async (params: {
    refreshToken: string;
    idToken?: string;
  }): Promise<void> => {
    const logoutUrl = endSessionEndpoint;

    try {
      const body = new URLSearchParams({
        client_id: validated.clientId,
        refresh_token: params.refreshToken,
      });
      if (params.idToken) {
        body.set("id_token_hint", params.idToken);
      }

      const response = await fetch(logoutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        logger.warn("Logout request failed, continuing with local cleanup", {
          status: response.status,
        });
        // ログアウト失敗はエラーをスローせず、ローカルのトークン削除は別途実行される
        return;
      }

      logger.info("Successfully logged out from Keycloak");
    } catch (error) {
      // ログアウトAPIへの通信失敗は警告のみ — ローカルクリーンアップは呼び出し元のfinallyブロックで実施
      // Keycloak側のセッションは有効期限で自然失効するため、エラーを再スローしない
      logger.warn("Keycloak logout request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return { generateAuthUrl, exchangeCodeForToken, refreshToken, logout };
};
