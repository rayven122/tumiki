/**
 * auth:getToken の返却型
 */
export type AuthTokenResult = {
  accessToken: string;
  idToken: string | null;
};
