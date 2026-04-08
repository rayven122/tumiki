/**
 * OAuth 2.0 認可URL生成
 *
 * 参考: apps/manager/src/lib/oauth/oauth-client.ts
 */

import type { AuthorizationServer, Client } from "oauth4webapi";

/** RFC 6749 §4.1.1: authorization code フローの response_type */
const RESPONSE_TYPE_AUTHORIZATION_CODE = "code";

/** RFC 7636 §4.2: PKCE code_challenge_method (S256) */
const CODE_CHALLENGE_METHOD_S256 = "S256";

/**
 * Authorization URLを生成
 *
 * ブラウザで開くOAuth認可URLを組み立てる。
 * PKCE (S256) + state パラメータを含む。
 */
export const generateAuthorizationUrl = (
  authServer: AuthorizationServer,
  client: Pick<Client, "client_id">,
  params: {
    redirectUri: string;
    scopes: string[];
    state: string;
    codeChallenge: string;
  },
): URL => {
  if (!authServer.authorization_endpoint) {
    throw new Error("Authorization endpoint not found in server metadata");
  }

  const authUrl = new URL(authServer.authorization_endpoint);

  authUrl.searchParams.set("client_id", client.client_id);
  authUrl.searchParams.set("redirect_uri", params.redirectUri);
  authUrl.searchParams.set("response_type", RESPONSE_TYPE_AUTHORIZATION_CODE);
  if (params.scopes.length > 0) {
    // RFC 6749 §3.3: scope はスペース区切り。URLSearchParams がクエリ上でエンコードする。
    authUrl.searchParams.set("scope", params.scopes.join(" "));
  }
  authUrl.searchParams.set("state", params.state);
  authUrl.searchParams.set("code_challenge", params.codeChallenge);
  authUrl.searchParams.set("code_challenge_method", CODE_CHALLENGE_METHOD_S256);

  return authUrl;
};
