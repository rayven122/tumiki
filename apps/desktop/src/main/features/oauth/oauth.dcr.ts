/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * 認可サーバーにクライアントを動的に登録し、client_id / client_secret を取得する。
 * 参考: apps/manager/src/lib/oauth/dcr.ts
 */

import * as oauth from "oauth4webapi";
import { DiscoveryError } from "./oauth.discovery";

/** DCRリダイレクトURI（カスタムプロトコル） */
export const MCP_OAUTH_REDIRECT_URI = "tumiki://oauth/callback";

/** DCRクライアント名（Figma等一部サーバーはこの値でホワイトリスト制御している） */
const CLIENT_NAME = "Claude Code";

/**
 * DCR統合関数: メタデータからクライアント登録を実行
 *
 * @param metadata - discoverOAuthMetadataで取得したAuthorizationServer
 * @returns DCR結果（metadata + registration）
 */
export const performDCR = async (
  metadata: oauth.AuthorizationServer,
): Promise<{
  metadata: oauth.AuthorizationServer;
  registration: oauth.Client;
}> => {
  if (!metadata.registration_endpoint) {
    throw new DiscoveryError(
      "Server does not support Dynamic Client Registration",
      "DCR_NOT_SUPPORTED",
    );
  }

  const clientMetadata: Partial<oauth.Client> = {
    client_name: CLIENT_NAME,
    redirect_uris: [MCP_OAUTH_REDIRECT_URI],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  };

  const response = await oauth.dynamicClientRegistrationRequest(
    metadata,
    clientMetadata,
  );

  // DCRエラーレスポンスのハンドリング
  if (!response.ok) {
    let errorDetail: string;
    try {
      errorDetail = await response.text();
    } catch {
      errorDetail = `HTTP ${response.status}`;
    }
    throw new DiscoveryError(
      `DCR registration failed: ${response.status} ${errorDetail}`,
      "DCR_REGISTRATION_FAILED",
      response.status,
    );
  }

  // oauth4webapiの厳格な検証を回避
  const responseJson = (await response.clone().json()) as Record<
    string,
    unknown
  >;

  // 一部サーバーは client_secret_expires_at を返さないため補完
  if (!("client_secret_expires_at" in responseJson)) {
    responseJson.client_secret_expires_at = 0;
  }

  // 一部サーバーは200を返すためRFC 7591準拠の201に変換
  const modifiedResponse = new Response(JSON.stringify(responseJson), {
    status: response.status === 200 ? 201 : response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  const registration =
    await oauth.processDynamicClientRegistrationResponse(modifiedResponse);

  return { metadata, registration };
};
