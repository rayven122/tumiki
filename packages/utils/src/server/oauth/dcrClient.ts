/**
 * Dynamic Client Registration (DCR) Client
 * RFC 7591準拠のDynamic Client Registrationを実装
 * 共通パッケージ版 - proxyServerとmanagerの両方で使用
 */

import type {
  AuthServerMetadata,
  ClientCredentials,
  ClientMetadata,
  OAuthError,
  ProtectedResourceMetadata,
  WWWAuthenticateChallenge,
} from "./types.js";

/**
 * デフォルト設定
 */
const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds
const DEFAULT_USER_AGENT = "tumiki/1.0";

/**
 * WWW-Authenticateヘッダーをパース
 */
export const parseWWWAuthenticate = (
  header: string,
): WWWAuthenticateChallenge => {
  const result: WWWAuthenticateChallenge = { scheme: "Bearer" };

  // スキーマを抽出（例: Bearer, Basic）
  const schemeMatch = /^(\w+)\s+/.exec(header);
  if (!schemeMatch) {
    throw new Error("Invalid WWW-Authenticate header format");
  }
  result.scheme = schemeMatch[1] ?? "Bearer";

  // パラメータを抽出
  const paramsString = header.substring(schemeMatch[0].length);
  const paramRegex = /(\w+)="([^"]+)"/g;
  let match;

  while ((match = paramRegex.exec(paramsString)) !== null) {
    const [, key, value] = match;
    switch (key) {
      case "realm":
        result.realm = value;
        break;
      case "scope":
        result.scope = value;
        break;
      case "error":
        result.error = value;
        break;
      case "error_description":
        result.error_description = value;
        break;
      case "error_uri":
        result.error_uri = value;
        break;
      case "resource":
        result.resource = value;
        break;
      case "as_uri":
        result.as_uri = value;
        break;
      case "authorization_uri":
        result.authorizationUri = value;
        break;
      case "token_uri":
        result.tokenUri = value;
        break;
    }
  }

  return result;
};

/**
 * Protected Resource Metadataを取得（RFC 9728）
 */
export const discoverProtectedResource = async (
  mcpServerUrl: string,
  options?: { userAgent?: string; timeout?: number },
): Promise<ProtectedResourceMetadata | null> => {
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT;

  try {
    const url = new URL(mcpServerUrl);
    const metadataUrl = `${url.origin}/.well-known/oauth-protected-resource`;

    console.log("Fetching Protected Resource Metadata", {
      mcpServerUrl,
      metadataUrl,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(metadataUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        console.debug("Protected Resource Metadata not found", {
          mcpServerUrl,
          status: response.status,
        });
        return null;
      }
      throw new Error(
        `Failed to fetch Protected Resource Metadata: ${response.status} ${response.statusText}`,
      );
    }

    const metadata = (await response.json()) as ProtectedResourceMetadata;

    console.log("Protected Resource Metadata retrieved", {
      mcpServerUrl,
      resource: metadata.resource,
      authServers: metadata.authorization_servers,
    });

    return metadata;
  } catch (error) {
    console.error("Failed to discover Protected Resource", {
      mcpServerUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Authorization Server Metadataを取得（RFC 8414）
 */
export const discoverAuthServer = async (
  authServerUrl: string,
  options?: { userAgent?: string; timeout?: number },
): Promise<AuthServerMetadata> => {
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT;

  try {
    // Try OAuth 2.0 Authorization Server Metadata first
    const oauthMetadataUrl = `${authServerUrl}/.well-known/oauth-authorization-server`;

    console.log("Fetching Authorization Server Metadata", {
      authServerUrl,
      metadataUrl: oauthMetadataUrl,
    });

    let response: Response;
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      response = await fetch(oauthMetadataUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": userAgent,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Fallback to OpenID Connect Discovery if OAuth metadata not found
    if (!response.ok && response.status === 404) {
      const oidcMetadataUrl = `${authServerUrl}/.well-known/openid-configuration`;
      console.log("Trying OpenID Connect Discovery", {
        authServerUrl,
        metadataUrl: oidcMetadataUrl,
      });

      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        response = await fetch(oidcMetadataUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": userAgent,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Authorization Server Metadata: ${response.status} ${response.statusText}`,
      );
    }

    const metadata = (await response.json()) as AuthServerMetadata;

    // Validate required fields
    if (
      !metadata.issuer ||
      !metadata.authorization_endpoint ||
      !metadata.token_endpoint
    ) {
      throw new Error(
        "Invalid Authorization Server Metadata: missing required fields",
      );
    }

    console.log("Authorization Server Metadata retrieved", {
      authServerUrl,
      issuer: metadata.issuer,
      registrationEndpoint: metadata.registration_endpoint,
      supportsDCR: !!metadata.registration_endpoint,
    });

    return metadata;
  } catch (error) {
    console.error("Failed to discover Authorization Server", {
      authServerUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Dynamic Client Registrationを実行（RFC 7591）
 */
export const registerClient = async (
  registrationEndpoint: string,
  metadata: ClientMetadata,
  options?: {
    accessToken?: string;
    userAgent?: string;
    timeout?: number;
  },
): Promise<ClientCredentials> => {
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT;

  try {
    console.log("Registering OAuth client", {
      registrationEndpoint,
      clientName: metadata.client_name,
      grantTypes: metadata.grant_types,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": userAgent,
    };

    // Some servers require authentication for registration
    if (options?.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(registrationEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(metadata),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: OAuthError;
      try {
        errorData = JSON.parse(errorText) as OAuthError;
      } catch {
        errorData = {
          error: "registration_failed",
          error_description: `Registration failed with status ${response.status}: ${errorText}`,
        };
      }

      console.error("Client registration failed", {
        registrationEndpoint,
        status: response.status,
        error: errorData,
      });

      throw new Error(
        errorData.error_description ??
          `Client registration failed: ${errorData.error}`,
      );
    }

    const credentials = (await response.json()) as ClientCredentials;

    // Validate response
    if (!credentials.client_id) {
      throw new Error("Invalid registration response: missing client_id");
    }

    console.log("OAuth client registered successfully", {
      clientId: credentials.client_id,
      hasSecret: !!credentials.client_secret,
      hasRegistrationToken: !!credentials.registration_access_token,
    });

    return credentials;
  } catch (error) {
    console.error("Failed to register OAuth client", {
      registrationEndpoint,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * クライアント情報を更新
 */
export const updateClient = async (
  registrationUrl: string,
  accessToken: string,
  metadata: Partial<ClientMetadata>,
  options?: { userAgent?: string; timeout?: number },
): Promise<ClientCredentials> => {
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT;

  try {
    console.log("Updating OAuth client", {
      registrationUrl,
      updates: Object.keys(metadata),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(registrationUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": userAgent,
      },
      body: JSON.stringify(metadata),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Client update failed", {
        registrationUrl,
        status: response.status,
        error: errorText,
      });

      throw new Error(`Client update failed: ${response.status} ${errorText}`);
    }

    const credentials = (await response.json()) as ClientCredentials;

    console.log("OAuth client updated successfully", {
      clientId: credentials.client_id,
    });

    return credentials;
  } catch (error) {
    console.error("Failed to update OAuth client", {
      registrationUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * クライアント情報を取得
 */
export const getClient = async (
  registrationUrl: string,
  accessToken: string,
  options?: { userAgent?: string; timeout?: number },
): Promise<ClientCredentials> => {
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT;

  try {
    console.debug("Fetching OAuth client info", {
      registrationUrl,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(registrationUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": userAgent,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch client info", {
        registrationUrl,
        status: response.status,
        error: errorText,
      });

      throw new Error(
        `Failed to fetch client info: ${response.status} ${errorText}`,
      );
    }

    const credentials = (await response.json()) as ClientCredentials;

    return credentials;
  } catch (error) {
    console.error("Failed to get OAuth client", {
      registrationUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * クライアントを削除
 */
export const deleteClient = async (
  registrationUrl: string,
  accessToken: string,
  options?: { userAgent?: string; timeout?: number },
): Promise<void> => {
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT;

  try {
    console.log("Deleting OAuth client", {
      registrationUrl,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(registrationUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": userAgent,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      console.error("Client deletion failed", {
        registrationUrl,
        status: response.status,
        error: errorText,
      });

      throw new Error(
        `Client deletion failed: ${response.status} ${errorText}`,
      );
    }

    console.log("OAuth client deleted successfully", {
      registrationUrl,
    });
  } catch (error) {
    console.error("Failed to delete OAuth client", {
      registrationUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
