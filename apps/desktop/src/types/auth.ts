/**
 * 認証トークンデータ型
 */
export type AuthTokenData = {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt: Date;
};

/**
 * auth:getToken の返却型
 */
export type AuthTokenResult = {
  accessToken: string;
  idToken: string | null;
};
