/**
 * simple-oauth2を使用したOAuth 2.0クライアント
 *
 * DCR（Dynamic Client Registration）で取得した設定を使用
 */

import { AuthorizationCode } from "simple-oauth2";

/**
 * PKCE対応のOAuth認可パラメータ
 * simple-oauth2の型定義に不足しているPKCEパラメータを追加
 */
export type PKCEAuthorizationParams = {
  redirect_uri: string;
  scope: string;
  state: string;
  code_challenge: string;
  code_challenge_method: "S256";
};

/**
 * PKCE対応のトークン取得パラメータ
 * simple-oauth2の型定義に不足しているcode_verifierを追加
 */
export type PKCETokenParams = {
  code: string;
  redirect_uri: string;
  code_verifier: string;
};

/**
 * OAuthトークンレスポンス
 * simple-oauth2が返すtokenオブジェクトの型
 */
export type OAuthTokenData = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
};

/**
 * OAuth プロバイダー設定
 * DCRまたはOAuthClientから取得した設定
 */
export type OAuthEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
};

/**
 * OAuth 2.0クライアントを作成
 *
 * @param clientId - OAuth クライアントID（DCRで取得）
 * @param clientSecret - OAuth クライアントシークレット（DCRで取得）
 * @param endpoints - 認可エンドポイントとトークンエンドポイント
 * @returns simple-oauth2 AuthorizationCodeクライアント
 */
export const createOAuthClient = (
  clientId: string,
  clientSecret: string,
  endpoints: OAuthEndpoints,
): AuthorizationCode => {
  const authUrl = new URL(endpoints.authorizationEndpoint);
  const tokenUrl = new URL(endpoints.tokenEndpoint);

  return new AuthorizationCode({
    client: {
      id: clientId,
      secret: clientSecret,
    },
    auth: {
      tokenHost: authUrl.origin,
      authorizePath: authUrl.pathname + authUrl.search,
      tokenPath: tokenUrl.pathname + tokenUrl.search,
    },
  });
};
