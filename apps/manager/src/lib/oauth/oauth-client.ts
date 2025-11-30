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
  // client_secret_postメソッドを使用
  if (!client.client_secret || typeof client.client_secret !== "string") {
    throw new Error("client_secret is required for token exchange");
  }

  const clientAuth = oauth.ClientSecretPost(client.client_secret);

  const response = await oauth.authorizationCodeGrantRequest(
    authServer,
    client,
    clientAuth,
    callbackParams,
    redirectUri,
    codeVerifier,
  );

  // Figmaの非標準エラーレスポンスを処理
  let processedResponse = response;
  if (!response.ok) {
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
  // PKCEを使用する場合はclient_secretを送信しない（Figma等のプロバイダー要件）
  // PKCE使用時はtoken_endpoint_auth_method="none"が推奨される
  const clientAuth = oauth.None();

  const response = await oauth.refreshTokenGrantRequest(
    authServer,
    client,
    clientAuth,
    refreshToken,
  );

  const result = await oauth.processRefreshTokenResponse(
    authServer,
    client,
    response,
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
