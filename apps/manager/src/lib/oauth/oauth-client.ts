/**
 * oauth4webapiを使用したOAuth 2.0クライアント
 *
 * DCR（Dynamic Client Registration）で取得した設定を使用
 */

import * as oauth from "oauth4webapi";
import { z } from "zod";

/**
 * Figma形式のエラーレスポンススキーマ
 * {"error":true,"message":"xxx","i18n":"yyy"}
 */
const FigmaErrorResponseSchema = z.object({
  error: z.literal(true),
  message: z.string(),
  i18n: z.string().optional(),
});

/**
 * OAuth トークンレスポンス
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
 * Authorization URLを生成
 *
 * @param authServer - OAuth Authorization Server
 * @param client - OAuth Client
 * @param params - Authorization パラメータ
 * @returns Authorization URL
 */
export const generateAuthorizationUrl = (
  authServer: oauth.AuthorizationServer,
  client: oauth.Client,
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
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", params.scopes.join(" "));
  authUrl.searchParams.set("state", params.state);
  authUrl.searchParams.set("code_challenge", params.codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return authUrl;
};

/**
 * クライアント認証方式を決定
 * client.token_endpoint_auth_method に基づいて適切な認証方式を選択
 *
 * @param client - OAuth Client
 * @returns ClientAuth
 */
const getClientAuth = (client: oauth.Client): ReturnType<typeof oauth.None> => {
  // token_endpoint_auth_methodが明示的に指定されている場合
  if (client.token_endpoint_auth_method) {
    switch (client.token_endpoint_auth_method) {
      case "none":
        return oauth.None();
      case "client_secret_basic":
        if (!client.client_secret || typeof client.client_secret !== "string") {
          throw new Error(
            "client_secret is required for client_secret_basic authentication",
          );
        }
        return oauth.ClientSecretBasic(client.client_secret);
      case "client_secret_post":
        if (!client.client_secret || typeof client.client_secret !== "string") {
          throw new Error(
            "client_secret is required for client_secret_post authentication",
          );
        }
        return oauth.ClientSecretPost(client.client_secret);
      default: {
        // 未対応の認証方式の場合はエラー
        const method =
          typeof client.token_endpoint_auth_method === "string"
            ? client.token_endpoint_auth_method
            : JSON.stringify(client.token_endpoint_auth_method);
        throw new Error(`Unsupported token_endpoint_auth_method: ${method}`);
      }
    }
  }

  // token_endpoint_auth_methodが未指定の場合
  // client_secretの有無で判断
  if (client.client_secret && typeof client.client_secret === "string") {
    return oauth.ClientSecretPost(client.client_secret);
  }

  // client_secretがない場合はnone
  return oauth.None();
};

/**
 * トークンを取得（Authorization Code Grant）
 *
 * @param authServer - OAuth Authorization Server
 * @param client - OAuth Client
 * @param callbackParams - コールバックから取得したパラメータ
 * @param redirectUri - Redirect URI
 * @param codeVerifier - PKCE Code Verifier
 * @returns Token データ
 */
export const exchangeCodeForToken = async (
  authServer: oauth.AuthorizationServer,
  client: oauth.Client,
  callbackParams: URLSearchParams,
  redirectUri: string,
  codeVerifier: string,
): Promise<OAuthTokenData> => {
  const clientAuth = getClientAuth(client);

  const response = await oauth.authorizationCodeGrantRequest(
    authServer,
    client,
    clientAuth,
    callbackParams,
    redirectUri,
    codeVerifier,
  );

  let processedResponse = response;
  if (response.ok) {
    const responseBody = await response.clone().text();
    processedResponse = new Response(responseBody, {
      status: 200,
      statusText: "OK",
      headers: response.headers,
    });
  } else {
    try {
      const errorBody: unknown = await response.clone().json();
      const parseResult = FigmaErrorResponseSchema.safeParse(errorBody);

      // Figma形式のエラーを検出
      if (parseResult.success) {
        // RFC 6749準拠の形式に変換
        const standardError = {
          error: parseResult.data.message,
          error_description: parseResult.data.i18n ?? parseResult.data.message,
        };

        // 新しいResponseオブジェクトを作成
        processedResponse = new Response(JSON.stringify(standardError), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    } catch {
      // JSONパースエラーの場合は何もしない
    }
  }

  const result = await oauth.processAuthorizationCodeResponse(
    authServer,
    client,
    processedResponse,
  );

  return {
    access_token: result.access_token,
    token_type: result.token_type,
    expires_in: result.expires_in,
    refresh_token: result.refresh_token,
    id_token: result.id_token,
    scope: result.scope,
  };
};

/**
 * トークンをリフレッシュ
 *
 * @param authServer - OAuth Authorization Server
 * @param client - OAuth Client
 * @param refreshToken - Refresh Token
 * @returns Token データ
 */
export const refreshAccessToken = async (
  authServer: oauth.AuthorizationServer,
  client: oauth.Client,
  refreshToken: string,
): Promise<OAuthTokenData> => {
  // トークン取得と同じ認証方式を使用
  const clientAuth = getClientAuth(client);

  const response = await oauth.refreshTokenGrantRequest(
    authServer,
    client,
    clientAuth,
    refreshToken,
  );

  let processedResponse = response;
  if (response.ok) {
    const responseBody = await response.clone().text();
    processedResponse = new Response(responseBody, {
      status: 200,
      statusText: "OK",
      headers: response.headers,
    });
  }

  const result = await oauth.processRefreshTokenResponse(
    authServer,
    client,
    processedResponse,
  );

  return {
    access_token: result.access_token,
    token_type: result.token_type,
    expires_in: result.expires_in,
    refresh_token: result.refresh_token,
    id_token: result.id_token,
    scope: result.scope,
  };
};
