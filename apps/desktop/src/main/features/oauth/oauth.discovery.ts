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
import {
  DISCOVERY_ERROR_CODE,
  type DiscoveryErrorCode,
} from "../../../shared/oauth/discovery-error-codes";
import * as logger from "../../shared/utils/logger";

export type { DiscoveryErrorCode };
export { DISCOVERY_ERROR_CODE };

// 規約例外: throw/catch/instanceofとの親和性のためError継承classを使用
export class DiscoveryError extends Error {
  constructor(
    message: string,
    public readonly code: DiscoveryErrorCode,
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

/** Protected Resource Metadata の JSON から、最初の authorization server URL を取る */
const fetchAuthorizationServerHint = async (
  protectedResourceUrl: URL,
): Promise<string | null> => {
  try {
    const res = await fetch(protectedResourceUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      authorization_servers?: string[];
    };
    return body.authorization_servers?.[0] ?? null;
  } catch (error) {
    // メタデータ欠如・ネットワーク／パース失敗は許容。それ以外だけ warn
    if (
      !(error instanceof TypeError) &&
      !(error instanceof SyntaxError) &&
      !(error instanceof Error && error.name === "AbortError")
    ) {
      logger.warn(
        `Unexpected error fetching Protected Resource Metadata: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return null;
  }
};

/**
 * AS メタデータ取得に試す issuer URL の列。
 * RFC 9728 で AS が取れた場合は AS 本体と resource パス付きの両方を試す。
 * 未対応時は元の server URL と origin の順で試す（パス付き MCP のフォールバック）。
 */
/** AS discovery で試す issuer URL の列（試行順のテスト用に export） */
export const issuerUrlsToTry = (params: {
  authorizationServerHint: string | null;
  resourcePath: string;
  serverUrl: string;
  origin: string;
}): string[] => {
  const { authorizationServerHint, resourcePath, serverUrl, origin } = params;
  if (authorizationServerHint) {
    return resourcePath
      ? [authorizationServerHint, `${authorizationServerHint}${resourcePath}`]
      : [authorizationServerHint];
  }
  return resourcePath ? [serverUrl, origin] : [origin];
};

const parseAuthorizationServerBody = async (
  response: Response,
): Promise<oauth.AuthorizationServer> => {
  const raw: unknown = await response.clone().json();
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as Record<string, unknown>).issuer !== "string"
  ) {
    throw new DiscoveryError(
      "Invalid AS Metadata: missing issuer",
      DISCOVERY_ERROR_CODE.AS_DISCOVERY_ERROR,
    );
  }
  return raw as oauth.AuthorizationServer;
};

/**
 * 単一の issuer URL で AS メタデータ取得を試みる。次の候補へ進むべき失敗は DiscoveryError を投げる。
 */
const tryDiscoverIssuer = async (
  issuerUrl: string,
): Promise<oauth.AuthorizationServer> => {
  const issuer = normalizeUrl(issuerUrl);
  const response = await oauth.discoveryRequest(issuer, {
    algorithm: "oauth2",
  });

  if (!response.ok) {
    throw new DiscoveryError(
      `AS Metadata not found: ${response.status}`,
      DISCOVERY_ERROR_CODE.AS_DISCOVERY_ERROR,
      response.status,
    );
  }

  const metadata = await parseAuthorizationServerBody(response);
  if (metadata.issuer !== issuer.toString()) {
    return resolveIssuerMismatch(issuer, metadata);
  }
  return oauth.processDiscoveryResponse(issuer, response);
};

/**
 * discovery レスポンスの issuer とリクエスト issuer が一致しないときの扱い。
 * 末尾スラッシュ差のみなら正規化 issuer で再取得。それ以外（CDN 等）でも実務上メタデータを採用する。
 */
const resolveIssuerMismatch = async (
  requestedIssuer: URL,
  metadata: oauth.AuthorizationServer,
): Promise<oauth.AuthorizationServer> => {
  const req = requestedIssuer.toString().replace(/\/$/, "");
  const declared = metadata.issuer.replace(/\/$/, "");
  if (req === declared) {
    const correctedIssuer = normalizeUrl(metadata.issuer);
    const retryResponse = await oauth.discoveryRequest(correctedIssuer, {
      algorithm: "oauth2",
    });
    if (retryResponse.ok) {
      return await oauth.processDiscoveryResponse(
        correctedIssuer,
        retryResponse,
      );
    }
    logger.warn(
      `resolveIssuerMismatch retry failed, using raw metadata: issuer=${metadata.issuer}`,
    );
    return metadata;
  }

  logger.warn(
    `Issuer mismatch: expected ${requestedIssuer.toString()}, got ${metadata.issuer}`,
  );
  return metadata;
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

  // パスが "/" のみの場合は PRM パスに付与しない（末尾スラッシュで401を返すサーバーがある）
  const resourcePath = url.pathname === "/" ? "" : url.pathname;
  const protectedResourceUrl = new URL(
    `/.well-known/oauth-protected-resource${resourcePath}`,
    url.origin,
  );

  const authorizationServerHint =
    await fetchAuthorizationServerHint(protectedResourceUrl);

  const urlsToTry = issuerUrlsToTry({
    authorizationServerHint,
    resourcePath,
    serverUrl,
    origin: url.origin,
  });

  let lastError: Error | null = null;
  for (const issuerUrl of urlsToTry) {
    try {
      return await tryDiscoverIssuer(issuerUrl);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError instanceof DiscoveryError
    ? lastError
    : new DiscoveryError(
        `OAuth discovery failed for ${serverUrl}: ${lastError?.message}`,
        DISCOVERY_ERROR_CODE.DISCOVERY_ERROR,
      );
};
