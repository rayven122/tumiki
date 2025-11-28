/**
 * OAuth 2.0 Dynamic Client Registration (DCR)
 * RFC 7591準拠のクライアント登録実装
 * oauth4webapiを使用したモダンな実装
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7591
 * @see https://datatracker.ietf.org/doc/html/rfc8414
 */

import * as oauth from "oauth4webapi";

/**
 * DCRエラー
 */
export class DCRError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "DCRError";
  }
}

/**
 * OAuth Authorization Server Metadataを取得
 *
 * @param serverUrl - MCPサーバーのベースURL
 * @returns OAuth Authorization Server
 * @throws {DCRError} メタデータ取得に失敗した場合
 */
export const discoverOAuthMetadata = async (
  serverUrl: string,
): Promise<oauth.AuthorizationServer> => {
  try {
    // URLを正規化（パス名を除いてオリジンのみを使用）
    // 例: https://mcp.linear.app/sse → https://mcp.linear.app
    const url = new URL(serverUrl);
    const issuer = new URL(url.origin);

    const response = await oauth.discoveryRequest(issuer);
    return await oauth.processDiscoveryResponse(issuer, response);
  } catch (error) {
    if (error instanceof oauth.WWWAuthenticateChallengeError) {
      throw new DCRError(
        `OAuth discovery failed: ${error.message}`,
        "DISCOVERY_ERROR",
        error.status,
      );
    }

    throw new DCRError(
      error instanceof Error
        ? error.message
        : "Unknown error during metadata discovery",
      "DISCOVERY_ERROR",
    );
  }
};

/**
 * OAuthクライアントを登録
 *
 * @param authServer - OAuth Authorization Server
 * @param clientMetadata - クライアントメタデータ
 * @param initialAccessToken - 初期アクセストークン（オプション）
 * @returns 登録されたクライアント情報
 * @throws {DCRError} 登録に失敗した場合
 */
export const registerOAuthClient = async (
  authServer: oauth.AuthorizationServer,
  clientMetadata: Partial<oauth.Client>,
  initialAccessToken?: string,
): Promise<oauth.Client> => {
  if (!authServer.registration_endpoint) {
    throw new DCRError(
      "Server does not support Dynamic Client Registration",
      "DCR_NOT_SUPPORTED",
    );
  }

  try {
    const headers = new Headers();
    if (initialAccessToken) {
      headers.set("Authorization", `Bearer ${initialAccessToken}`);
    }

    const response = await oauth.dynamicClientRegistrationRequest(
      authServer,
      clientMetadata,
      { headers },
    );

    return await oauth.processDynamicClientRegistrationResponse(response);
  } catch (error) {
    if (error instanceof oauth.WWWAuthenticateChallengeError) {
      throw new DCRError(
        `Client registration failed: ${error.message}`,
        "REGISTRATION_FAILED",
        error.status,
      );
    }

    throw new DCRError(
      error instanceof Error
        ? error.message
        : "Unknown error during client registration",
      "REGISTRATION_ERROR",
    );
  }
};

/**
 * DCR統合関数: メタデータ取得からクライアント登録まで
 *
 * @param serverUrl - MCPサーバーのベースURL
 * @param clientName - クライアント名
 * @param redirectUris - リダイレクトURI配列
 * @param scopes - 要求するスコープ（スペース区切り、オプション）
 * @param initialAccessToken - 初期アクセストークン（オプション）
 * @param clientIdentifier - OAuth登録時に使用するクライアント識別子（デフォルト: "Claude Code"）
 * @returns メタデータと登録情報を含むオブジェクト
 * @throws {DCRError} 処理に失敗した場合
 */
export const performDCR = async (
  serverUrl: string,
  clientName: string,
  redirectUris: string[],
  scopes?: string,
  initialAccessToken?: string,
  clientIdentifier?: string,
): Promise<{
  metadata: oauth.AuthorizationServer;
  registration: oauth.Client;
}> => {
  // Step 1: OAuth メタデータを取得
  const metadata = await discoverOAuthMetadata(serverUrl);

  // Step 2: クライアントを登録
  // ホワイトリスト制限があるサーバー（Figmaなど）に対応するため、
  // 承認されたクライアント名を使用
  const clientMetadata: Partial<oauth.Client> = {
    client_name: clientIdentifier ?? "Claude Code",
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
    ...(scopes && { scope: scopes }),
  };

  const registration = await registerOAuthClient(
    metadata,
    clientMetadata,
    initialAccessToken,
  );

  return {
    metadata,
    registration,
  };
};
