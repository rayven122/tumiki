/**
 * OAuth 2.0 Dynamic Client Registration (DCR)
 * RFC 7591準拠のクライアント登録実装
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7591
 */

/**
 * OAuth Authorization Server Metadata
 * RFC 8414準拠のメタデータ形式
 */
export type OAuthMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
};

/**
 * DCR登録リクエスト
 */
export type ClientRegistrationRequest = {
  client_name: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
  contacts?: string[];
  logo_uri?: string;
  client_uri?: string;
  policy_uri?: string;
  tos_uri?: string;
};

/**
 * DCR登録レスポンス
 */
export type ClientRegistrationResponse = {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  registration_access_token?: string;
  registration_client_uri?: string;
  grant_types?: string[];
  response_types?: string[];
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
};

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
 * @returns OAuth メタデータ
 * @throws {DCRError} メタデータ取得に失敗した場合
 */
export const discoverOAuthMetadata = async (
  serverUrl: string,
): Promise<OAuthMetadata> => {
  try {
    // URLを正規化（パス名を除いてオリジンのみを使用）
    // 例: https://mcp.linear.app/sse → https://mcp.linear.app
    const url = new URL(serverUrl);
    const baseUrl = url.origin;

    // RFC 8414準拠の.well-knownエンドポイントを試行
    const wellKnownUrl = `${baseUrl}/.well-known/oauth-authorization-server`;

    const response = await fetch(wellKnownUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new DCRError(
        `Failed to fetch OAuth metadata: ${response.statusText}`,
        "METADATA_FETCH_FAILED",
        response.status,
      );
    }

    const metadata = (await response.json()) as OAuthMetadata;

    // 必須フィールドの検証
    if (
      !metadata.issuer ||
      !metadata.authorization_endpoint ||
      !metadata.token_endpoint
    ) {
      throw new DCRError(
        "Invalid OAuth metadata: missing required fields",
        "INVALID_METADATA",
      );
    }

    return metadata;
  } catch (error) {
    if (error instanceof DCRError) {
      throw error;
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
 * @param registrationEndpoint - 登録エンドポイントURL
 * @param request - 登録リクエスト
 * @param initialAccessToken - 初期アクセストークン（オプション）
 * @returns 登録レスポンス
 * @throws {DCRError} 登録に失敗した場合
 */
export const registerOAuthClient = async (
  registrationEndpoint: string,
  request: ClientRegistrationRequest,
  initialAccessToken?: string,
): Promise<ClientRegistrationResponse> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // 初期アクセストークンがある場合は追加
    if (initialAccessToken) {
      headers.Authorization = `Bearer ${initialAccessToken}`;
    }

    const response = await fetch(registrationEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error_description?: string;
      };
      const errorMessage = errorData.error_description ?? response.statusText;

      throw new DCRError(
        `Client registration failed: ${errorMessage}`,
        "REGISTRATION_FAILED",
        response.status,
      );
    }

    const registration = (await response.json()) as ClientRegistrationResponse;

    // 必須フィールドの検証
    if (!registration.client_id) {
      throw new DCRError(
        "Invalid registration response: missing client_id",
        "INVALID_REGISTRATION_RESPONSE",
      );
    }

    return registration;
  } catch (error) {
    if (error instanceof DCRError) {
      throw error;
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
 * @param scopes - 要求するスコープ（スペース区切り）
 * @param initialAccessToken - 初期アクセストークン（オプション）
 * @returns メタデータと登録情報を含むオブジェクト
 * @throws {DCRError} 処理に失敗した場合
 */
export const performDCR = async (
  serverUrl: string,
  clientName: string,
  redirectUris: string[],
  scopes?: string,
  initialAccessToken?: string,
): Promise<{
  metadata: OAuthMetadata;
  registration: ClientRegistrationResponse;
}> => {
  // Step 1: OAuth メタデータを取得
  const metadata = await discoverOAuthMetadata(serverUrl);

  // Step 2: 登録エンドポイントの確認
  if (!metadata.registration_endpoint) {
    throw new DCRError(
      "Server does not support Dynamic Client Registration",
      "DCR_NOT_SUPPORTED",
    );
  }

  // Step 3: クライアントを登録
  const registrationRequest: ClientRegistrationRequest = {
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
    scope: scopes,
  };

  const registration = await registerOAuthClient(
    metadata.registration_endpoint,
    registrationRequest,
    initialAccessToken,
  );

  return {
    metadata,
    registration,
  };
};
