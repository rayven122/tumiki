/**
 * 認証トークンデータ型
 */
export type AuthTokenData = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};
