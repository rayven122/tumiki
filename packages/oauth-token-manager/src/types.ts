/**
 * OAuth Token Manager - 型定義とエラークラス
 */

/**
 * トークン情報（復号化済み）
 */
export type DecryptedToken = {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string | null;
  expiresAt: Date | null;
  refreshExpiresAt: Date | null;
  isValid: boolean;
  lastUsedAt: Date | null;
  refreshCount: number;
  oauthClientId: string;
};

/**
 * OAuthクライアント情報
 */
export type OAuthClientInfo = {
  id: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpoint: string;
  authorizationEndpoint: string;
  tokenEndpointAuthMethod: string;
};

/**
 * トークンリフレッシュレスポンス
 */
export type TokenRefreshResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

/**
 * 再認証が必要なエラー
 */
export class ReAuthRequiredError extends Error {
  constructor(
    message: string,
    public readonly tokenId: string,
    public readonly userId: string,
    public readonly mcpServerId: string,
  ) {
    super(message);
    this.name = "ReAuthRequiredError";
  }
}

/**
 * トークンリフレッシュエラー
 */
export class TokenRefreshError extends Error {
  constructor(
    message: string,
    public readonly tokenId: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "TokenRefreshError";
  }
}
