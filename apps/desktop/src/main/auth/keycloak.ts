import { z } from "zod";
import * as logger from "../utils/logger";

/**
 * Keycloak設定のスキーマ
 */
const keycloakConfigSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
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
  expires_in: z.number(),
  token_type: z.string(),
});

/**
 * トークンレスポンス型
 */
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

/**
 * Keycloakクライアント
 */
export class KeycloakClient {
  private readonly config: KeycloakConfig;

  constructor(config: KeycloakConfig) {
    const validated = keycloakConfigSchema.parse(config);
    this.config = validated;
  }

  /**
   * 認証URLを生成（OAuth 2.0 + PKCE）
   */
  generateAuthUrl(params: { codeChallenge: string; state: string }): string {
    const { codeChallenge, state } = params;
    const authUrl = new URL(
      `${this.config.issuer}/protocol/openid-connect/auth`,
    );

    authUrl.searchParams.set("client_id", this.config.clientId);
    authUrl.searchParams.set("redirect_uri", this.config.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    // Keycloakのログイン画面をスキップして直接Googleにリダイレクト
    authUrl.searchParams.set("kc_idp_hint", "google");

    return authUrl.toString();
  }

  /**
   * 認可コードをアクセストークンと交換
   */
  async exchangeCodeForToken(params: {
    code: string;
    codeVerifier: string;
  }): Promise<TokenResponse> {
    const { code, codeVerifier } = params;
    const tokenUrl = `${this.config.issuer}/protocol/openid-connect/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Token exchange failed", {
          status: response.status,
          error: errorText,
        });
        throw new Error(
          `トークン取得に失敗しました: ${response.status} ${errorText}`,
        );
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
  }

  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const tokenUrl = `${this.config.issuer}/protocol/openid-connect/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Token refresh failed", {
          status: response.status,
          error: errorText,
        });
        throw new Error(
          `トークンリフレッシュに失敗しました: ${response.status} ${errorText}`,
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
  }

  /**
   * Keycloakからログアウト
   */
  async logout(params: {
    refreshToken: string;
    idToken?: string;
  }): Promise<void> {
    const { refreshToken } = params;
    const logoutUrl = `${this.config.issuer}/protocol/openid-connect/logout`;

    try {
      const response = await fetch(logoutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
        }),
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
  }
}
