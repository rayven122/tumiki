/**
 * OAuth 2.0 Dynamic Client Registration (DCR)
 *
 * MCP仕様（2025-06-18）に準拠した2段階discovery:
 * 1. Protected Resource Metadata (RFC 9728) を取得
 * 2. Authorization Server Metadata (RFC 8414) を取得
 */

import * as oauth from "oauth4webapi";

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

/** URLを正規化（クエリ、フラグメント、末尾スラッシュを削除） */
const normalizeUrl = (serverUrl: string): URL => {
  const url = new URL(serverUrl);
  url.search = "";
  url.hash = "";
  if (url.pathname.endsWith("/") && url.pathname !== "/") {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url;
};

/**
 * OAuth Authorization Server Metadataを取得
 *
 * 2段階discoveryを実行:
 * 1. Protected Resource Metadata (RFC 9728) からAS URLを取得
 * 2. Authorization Server Metadata (RFC 8414) を取得
 */
export const discoverOAuthMetadata = async (
  serverUrl: string,
): Promise<oauth.AuthorizationServer> => {
  const url = normalizeUrl(serverUrl);

  // Step 1: Protected Resource Metadata を試す
  const protectedResourceUrl = new URL(
    `/.well-known/oauth-protected-resource${url.pathname}`,
    url.origin,
  );

  let asUrl: string | null = null;
  try {
    const res = await fetch(protectedResourceUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const metadata = (await res.json()) as {
        authorization_servers?: string[];
      };
      if (metadata.authorization_servers?.[0]) {
        asUrl = metadata.authorization_servers[0];
      }
    }
  } catch (error) {
    // Protected Resource Metadata が見つからない場合はデバッグログを記録
    // ネットワークエラー（TypeError）やパースエラー（SyntaxError）は許容
    if (
      !(error instanceof TypeError) &&
      !(error instanceof SyntaxError) &&
      !(error instanceof Error && error.name === "AbortError")
    ) {
      // 予期しないエラータイプの場合は警告を出力
      console.warn(
        `Unexpected error fetching Protected Resource Metadata: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Step 2: AS Metadata を取得（複数のURLを試行）
  const urlsToTry = asUrl
    ? [asUrl, `${asUrl}${url.pathname}`]
    : [serverUrl, url.origin];

  let lastError: Error | null = null;
  for (const issuerUrl of urlsToTry) {
    try {
      const issuer = normalizeUrl(issuerUrl);
      const response = await oauth.discoveryRequest(issuer, {
        algorithm: "oauth2",
      });

      if (!response.ok) {
        lastError = new DCRError(
          `AS Metadata not found: ${response.status}`,
          "AS_DISCOVERY_ERROR",
          response.status,
        );
        continue;
      }

      // issuerが異なる場合はorigin一致性を検証
      const metadata = (await response
        .clone()
        .json()) as oauth.AuthorizationServer;
      if (metadata.issuer !== issuer.toString()) {
        // セキュリティ: issuer不一致を検出した場合、originの一致を検証
        console.warn(
          `Issuer mismatch: expected ${issuer.toString()}, got ${metadata.issuer}`,
        );

        // originが一致しない場合は攻撃の可能性があるためエラー
        const metadataIssuerUrl = new URL(metadata.issuer);
        if (metadataIssuerUrl.origin !== issuer.origin) {
          throw new DCRError(
            `Invalid issuer: origin mismatch (expected ${issuer.origin}, got ${metadataIssuerUrl.origin})`,
            "ISSUER_VALIDATION_ERROR",
          );
        }

        // originは一致するが完全一致ではない場合、メタデータを使用（パス違いなど）
        return metadata;
      }
      return await oauth.processDiscoveryResponse(issuer, response);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError instanceof DCRError
    ? lastError
    : new DCRError(
        `OAuth discovery failed for ${serverUrl}: ${lastError?.message}`,
        "DISCOVERY_ERROR",
      );
};

/**
 * DCR統合関数: メタデータ取得からクライアント登録まで
 */
export const performDCR = async (
  serverUrl: string,
  redirectUris: string[],
  scopes?: string,
  initialAccessToken?: string,
  clientIdentifier?: string,
): Promise<{
  metadata: oauth.AuthorizationServer;
  registration: oauth.Client;
}> => {
  const metadata = await discoverOAuthMetadata(serverUrl);

  if (!metadata.registration_endpoint) {
    throw new DCRError(
      "Server does not support Dynamic Client Registration",
      "DCR_NOT_SUPPORTED",
    );
  }

  const headers = new Headers();
  if (initialAccessToken) {
    headers.set("Authorization", `Bearer ${initialAccessToken}`);
  }

  const clientMetadata: Partial<oauth.Client> = {
    client_name: clientIdentifier ?? "Claude Code",
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
    ...(scopes && { scope: scopes }),
  };

  const response = await oauth.dynamicClientRegistrationRequest(
    metadata,
    clientMetadata,
    { headers },
  );

  // oauth4webapiの厳格な検証を回避
  const responseJson = (await response.clone().json()) as Record<
    string,
    unknown
  >;
  if (!("client_secret_expires_at" in responseJson)) {
    responseJson.client_secret_expires_at = 0;
  }

  // 一部サーバーは200を返すため201に変換
  const modifiedResponse = new Response(JSON.stringify(responseJson), {
    status: response.status === 200 ? 201 : response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  const registration =
    await oauth.processDynamicClientRegistrationResponse(modifiedResponse);

  return { metadata, registration };
};
