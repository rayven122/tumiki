/**
 * OAuth 2.0 トークン交換
 *
 * 認可コードをアクセストークンに交換し、リフレッシュトークンでの更新も行う。
 * 参考: apps/manager/src/lib/oauth/oauth-client.ts
 */

import * as oauth from "oauth4webapi";
import { z } from "zod";
import type { McpOAuthTokenData } from "./oauth.types";

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
 * クライアント認証方式を決定
 * client.token_endpoint_auth_method に基づいて適切な認証方式を選択
 */
const getClientAuth = (client: oauth.Client): oauth.ClientAuth => {
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
        const method =
          typeof client.token_endpoint_auth_method === "string"
            ? client.token_endpoint_auth_method
            : JSON.stringify(client.token_endpoint_auth_method);
        throw new Error(`Unsupported token_endpoint_auth_method: ${method}`);
      }
    }
  }

  // token_endpoint_auth_methodが未指定の場合、client_secretの有無で判断
  if (client.client_secret && typeof client.client_secret === "string") {
    return oauth.ClientSecretPost(client.client_secret);
  }

  return oauth.None();
};

/**
 * カスタムfetch関数
 * 一部のサーバー（Neonなど）は charset=UTF-8 を受け入れず 415 エラーを返すため削除
 */
const customFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);

  const contentType = headers.get("content-type");
  if (contentType?.includes("charset")) {
    headers.set(
      "content-type",
      contentType.replace(/;\s*charset=[^;]*/i, "").trim(),
    );
  }

  return fetch(input, { ...init, headers });
};

/**
 * 認可コードをアクセストークンに交換
 */
export const exchangeCodeForToken = async (
  authServer: oauth.AuthorizationServer,
  client: oauth.Client,
  callbackUrl: URL,
  redirectUri: string,
  codeVerifier: string,
  expectedState: string,
): Promise<McpOAuthTokenData> => {
  const clientAuth = getClientAuth(client);

  // oauth4webapiはvalidateAuthResponseの結果をcallbackParametersとして要求する
  // エラー時はthrowされる
  const validatedParams = oauth.validateAuthResponse(
    authServer,
    client,
    callbackUrl,
    expectedState,
  );

  const response = await oauth.authorizationCodeGrantRequest(
    authServer,
    client,
    clientAuth,
    validatedParams,
    redirectUri,
    codeVerifier,
    { [oauth.customFetch]: customFetch },
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

      // Figma形式のエラーをRFC 6749準拠の形式に変換
      if (parseResult.success) {
        const standardError = {
          error: parseResult.data.message,
          error_description: parseResult.data.i18n ?? parseResult.data.message,
        };
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
    refresh_token: result.refresh_token,
    expires_at: result.expires_in
      ? Math.floor(Date.now() / 1000) + result.expires_in
      : undefined,
    scope: result.scope,
  };
};

/**
 * リフレッシュトークンでアクセストークンを更新
 * TODO: トークン自動リフレッシュ機能の実装時に呼び出し元を追加する
 */
export const refreshAccessToken = async (
  authServer: oauth.AuthorizationServer,
  client: oauth.Client,
  refreshToken: string,
): Promise<McpOAuthTokenData> => {
  const clientAuth = getClientAuth(client);

  const response = await oauth.refreshTokenGrantRequest(
    authServer,
    client,
    clientAuth,
    refreshToken,
    { [oauth.customFetch]: customFetch },
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
    refresh_token: result.refresh_token,
    expires_at: result.expires_in
      ? Math.floor(Date.now() / 1000) + result.expires_in
      : undefined,
    scope: result.scope,
  };
};
