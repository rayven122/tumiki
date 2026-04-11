/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * 認可サーバーにクライアントを動的に登録し、client_id / client_secret を取得する。
 * 参考: apps/manager/src/lib/oauth/dcr.ts
 */

import {
  dynamicClientRegistrationRequest,
  processDynamicClientRegistrationResponse,
  type AuthorizationServer,
  type Client,
} from "oauth4webapi";
import { DiscoveryError, DISCOVERY_ERROR_CODE } from "./oauth.discovery";

/** DCRリダイレクトURI（カスタムプロトコル） */
export const MCP_OAUTH_REDIRECT_URI = "tumiki://oauth/callback";

/**
 * DCRクライアント名
 * 変更禁止: Figma等一部サーバーはこの値でDCR登録をホワイトリスト制御しており、
 * 異なる値では登録が拒否される（403 Forbidden）。実際の動作確認で確定済み。
 */
const CLIENT_NAME = "Claude Code";

/**
 * DCR統合関数: メタデータからクライアント登録を実行
 *
 * @param metadata - discoverOAuthMetadataで取得したAuthorizationServer
 * @returns DCR結果（metadata + registration）
 */
export const performDCR = async (
  metadata: AuthorizationServer,
): Promise<{
  metadata: AuthorizationServer;
  registration: Client;
}> => {
  if (!metadata.registration_endpoint) {
    throw new DiscoveryError(
      "Server does not support Dynamic Client Registration",
      DISCOVERY_ERROR_CODE.DCR_NOT_SUPPORTED,
    );
  }

  const clientMetadata: Partial<Client> = {
    client_name: CLIENT_NAME,
    redirect_uris: [MCP_OAUTH_REDIRECT_URI],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  };

  const response = await dynamicClientRegistrationRequest(
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
      DISCOVERY_ERROR_CODE.DCR_REGISTRATION_FAILED,
      response.status,
    );
  }

  // processDynamicClientRegistrationResponse は 201 や client_secret_expires_at 等で厳格だが、
  // 実 IdP は 200・省略などで一致しない。成功 JSON を軽く整えてから同じパーサに渡す。
  const responseJson = (await response.clone().json()) as Record<
    string,
    unknown
  >;

  // 省略時は 0 を補う（RFC 7591: 0 は client_secret が無期限などの意味で使われる）
  if (!("client_secret_expires_at" in responseJson)) {
    responseJson.client_secret_expires_at = 0;
  }

  // 201 以外を拒否する実装に合わせ、成功時の 200 を 201 に載せ替える
  const modifiedResponse = new Response(JSON.stringify(responseJson), {
    status: response.status === 200 ? 201 : response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  const registration =
    await processDynamicClientRegistrationResponse(modifiedResponse);

  return { metadata, registration };
};
