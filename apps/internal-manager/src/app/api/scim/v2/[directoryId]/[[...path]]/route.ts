import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureJackson } from "~/server/jackson/route-helpers";
import { handleDirectorySyncEvent } from "~/server/scim/event-handler";

/**
 * SCIM 2.0 キャッチオール Route Handler
 *
 * Jackson Directory Sync (`directorySyncController.requests.handle`) に
 * リクエストを丸ごと委譲する。SCIM フィルタ・PATCH 解析・ページネーション
 * 等は Jackson が処理し、データ変更イベントは event-handler 経由で内部DBへ
 * 同期される。
 *
 * URL 構造: /api/scim/v2/<directoryId>/{Users|Groups}[/<resourceId>]
 */

type RouteContext = {
  params: Promise<{ directoryId: string; path?: string[] }>;
};

const SCIM_CONTENT_TYPE = "application/scim+json";

const extractBearerToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
};

const parseQuery = (searchParams: URLSearchParams) => {
  const startIndex = searchParams.get("startIndex");
  const count = searchParams.get("count");
  const filter = searchParams.get("filter") ?? undefined;
  return {
    startIndex: startIndex ? Number(startIndex) : undefined,
    count: count ? Number(count) : undefined,
    filter,
  };
};

const scimResponse = (data: unknown, status: number) =>
  NextResponse.json(data, {
    status,
    headers: { "Content-Type": SCIM_CONTENT_TYPE },
  });

const handler = async (req: NextRequest, { params }: RouteContext) => {
  const ensured = await ensureJackson();
  if (!ensured.ok) {
    // SAML/OIDC ルートと共用される ensureJackson のレスポンスは SCIM 形式ではない
    // SCIM 2.0 (RFC 7644) フォーマットでラップし直す
    return scimResponse(
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "503",
        detail: "SCIM service is unavailable",
      },
      503,
    );
  }

  const { directoryId, path = [] } = await params;
  const [resourceType, resourceId] = path;

  if (!resourceType) {
    return scimResponse(
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "404",
        detail: "Resource type is required",
      },
      404,
    );
  }

  const apiSecret = extractBearerToken(req);

  let body: unknown;
  if (req.method !== "GET" && req.method !== "DELETE") {
    body = await req.json().catch(() => undefined);
  }

  const { directorySyncController } = ensured.jackson;

  const response = await directorySyncController.requests.handle(
    {
      method: req.method,
      body,
      directoryId,
      resourceType,
      resourceId,
      apiSecret,
      query: parseQuery(req.nextUrl.searchParams),
    },
    handleDirectorySyncEvent,
  );

  // 204 No Content（DELETE 成功時）はボディなし
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return scimResponse(response.data, response.status);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
