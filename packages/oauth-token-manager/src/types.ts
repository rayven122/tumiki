/**
 * OAuth Token Manager - 型定義とエラークラス
 */

import { z } from "zod";

/**
 * トークン情報のZodスキーマ
 */
export const decryptedTokenSchema = z.object({
  id: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().nullable(),
  expiresAt: z.coerce.date().nullable(),
  oauthClientId: z.string(),
});

/**
 * トークン情報（復号化済み）
 */
export type DecryptedToken = z.infer<typeof decryptedTokenSchema>;

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
