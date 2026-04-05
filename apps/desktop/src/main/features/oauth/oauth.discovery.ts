/**
 * OAuth 2.0 Discovery
 *
 * MCP仕様（2025-06-18）に準拠した2段階discovery:
 * 1. Protected Resource Metadata (RFC 9728) を取得
 * 2. Authorization Server Metadata (RFC 8414) を取得
 *
 * 参考: apps/manager/src/lib/oauth/dcr.ts
 */

import * as oauth from "oauth4webapi";

export class DiscoveryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "DiscoveryError";
  }
}

/** URLを正規化（クエリ、フラグメント、末尾スラッシュを削除） */
export const normalizeUrl = (serverUrl: string): URL => {
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
    // Protected Resource Metadata が見つからない場合は許容
    // ネットワークエラー（TypeError）やパースエラー（SyntaxError）は許容
    if (
      !(error instanceof TypeError) &&
      !(error instanceof SyntaxError) &&
      !(error instanceof Error && error.name === "AbortError")
    ) {
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
        lastError = new DiscoveryError(
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
        // 末尾スラッシュの差異のみの場合はissuerを正規化して一致させる
        const normalizedIssuer = issuer.toString().replace(/\/$/, "");
        const normalizedMetadataIssuer = metadata.issuer.replace(/\/$/, "");
        if (normalizedIssuer === normalizedMetadataIssuer) {
          // 末尾スラッシュの差異のみ — processDiscoveryResponseのissuer検証をスキップ
          return metadata;
        }

        console.warn(
          `Issuer mismatch: expected ${issuer.toString()}, got ${metadata.issuer}`,
        );

        // originが一致しない場合は攻撃の可能性があるためエラー
        const metadataIssuerUrl = new URL(metadata.issuer);
        if (metadataIssuerUrl.origin !== issuer.origin) {
          throw new DiscoveryError(
            `Invalid issuer: origin mismatch (expected ${issuer.origin}, got ${metadataIssuerUrl.origin})`,
            "ISSUER_VALIDATION_ERROR",
          );
        }

        // originは一致するが完全一致ではない場合、メタデータを使用
        return metadata;
      }
      return await oauth.processDiscoveryResponse(issuer, response);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError instanceof DiscoveryError
    ? lastError
    : new DiscoveryError(
        `OAuth discovery failed for ${serverUrl}: ${lastError?.message}`,
        "DISCOVERY_ERROR",
      );
};
