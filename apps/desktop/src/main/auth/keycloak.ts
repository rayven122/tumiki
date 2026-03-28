import { z } from "zod";
import * as logger from "../utils/logger";

/**
 * Keycloak設定のスキーマ
 */
const keycloakConfigSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  redirectUri: z.string().min(1),
});

/**
 * Keycloak設定型
 */
export type KeycloakConfig = z.infer<typeof keycloakConfigSchema>;

/**
 * トークンレスポンスのスキーマ
 */
const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  id_token: z.string().optional(),
  expires_in: z.number().int().positive(),
  token_type: z.string(),
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
  // issuerの末尾スラッシュを正規化してURL結合時の重複を防止
  const normalizedConfig: KeycloakConfig = {
    ...validated,
    issuer: validated.issuer.replace(/\/$/, ""),
  };

  /**
   * 認証URLを生成（OAuth 2.0 + PKCE）
   */
  const generateAuthUrl = (params: {
    codeChallenge: string;
    state: string;
  }): string => {
    const { codeChallenge, state } = params;
    const authUrl = new URL(
      `${normalizedConfig.issuer}/protocol/openid-connect/auth`,
    );

    authUrl.searchParams.set("client_id", normalizedConfig.clientId);
    authUrl.searchParams.set("redirect_uri", normalizedConfig.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email");
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
    const tokenUrl = `${normalizedConfig.issuer}/protocol/openid-connect/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: normalizedConfig.clientId,
          code,
          redirect_uri: normalizedConfig.redirectUri,
          code_verifier: codeVerifier,
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Token exchange failed", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`トークン取得に失敗しました（${response.status}）`);
      }

      const data = await response.json();
      return tokenResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to exchange code for token", error);
      } else {
        logger.error("Failed to exchange code for token", { error });
      }
      throw error;
    }
  };

  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  const refreshToken = async (token: string): Promise<TokenResponse> => {
    const tokenUrl = `${normalizedConfig.issuer}/protocol/openid-connect/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: normalizedConfig.clientId,
          refresh_token: token,
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Token refresh failed", {
          status: response.status,
          error: errorText,
        });
        throw new Error(
          `トークンリフレッシュに失敗しました（${response.status}）`,
        );
      }

      const data = await response.json();
      return tokenResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to refresh token", error);
      } else {
        logger.error("Failed to refresh token", { error });
      }
      throw error;
    }
  };

  /**
   * Keycloakからログアウト
   */
  const logout = async (params: {
    refreshToken: string;
    idToken?: string;
  }): Promise<void> => {
    const logoutUrl = `${normalizedConfig.issuer}/protocol/openid-connect/logout`;

    try {
      const body = new URLSearchParams({
        client_id: normalizedConfig.clientId,
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
        const errorText = await response.text();
        logger.warn("Logout request failed", {
          status: response.status,
          error: errorText,
        });
        // ログアウト失敗はエラーをスローせず、警告ログのみ
      }

      logger.info("Successfully logged out from Keycloak");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to logout from Keycloak", error);
      } else {
        logger.error("Failed to logout from Keycloak", { error });
      }
      // ログアウトエラーは握りつぶす（ローカルのトークン削除は別途実行される）
    }
  };

  return { generateAuthUrl, exchangeCodeForToken, refreshToken, logout };
};
