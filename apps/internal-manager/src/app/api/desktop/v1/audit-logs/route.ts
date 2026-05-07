import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@tumiki/internal-db/server";
import { createClient } from "redis";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_REQUESTS = 60;
const RATE_LIMIT_WINDOW_SECONDS = RATE_LIMIT_WINDOW_MS / 1000;

let redisClientPromise: Promise<ReturnType<typeof createClient>> | null = null;
let redisClientUrl: string | null = null;

const querySchema = z
  .object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    mcpServerId: z.string().min(1).optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_LIMIT)
      .default(DEFAULT_LIMIT),
    cursor: z.string().min(1).optional(),
  })
  .refine(({ from, to }) => !from || !to || new Date(from) <= new Date(to), {
    message: "from must be before or equal to to",
    path: ["from"],
  });

const cursorSchema = z.object({
  occurredAt: z.iso.datetime({ offset: true }),
  id: z.string().min(1),
});

const encodeCursor = (cursor: z.infer<typeof cursorSchema>) =>
  Buffer.from(JSON.stringify(cursor)).toString("base64url");

const decodeCursor = (cursor: string) => {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    const parsed = cursorSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const getRateLimitRedisClient = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  if (redisClientUrl !== redisUrl) {
    const oldClientPromise = redisClientPromise;
    redisClientPromise = null;
    redisClientUrl = redisUrl;
    void oldClientPromise
      ?.then((client) => client.disconnect())
      .catch(() => undefined);
  }

  if (!redisClientPromise) {
    const client = createClient({ url: redisUrl });
    const clientPromise = (async () => {
      await client.connect();
      return client;
    })().catch((error) => {
      if (redisClientPromise === clientPromise) {
        redisClientPromise = null;
      }
      throw error;
    });

    client.on("error", (error) => {
      console.error("Redis rate limit client error:", error);
      if (redisClientPromise === clientPromise) {
        redisClientPromise = null;
      }
      void client.disconnect().catch(() => undefined);
    });
    redisClientPromise = clientPromise;
  }

  return redisClientPromise;
};

const checkRateLimit = async (userId: string) => {
  try {
    const client = await getRateLimitRedisClient();
    if (!client) return { allowed: true, retryAfter: null };

    const windowId = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);
    const key = `internal-manager:desktop:v1:audit-logs:rate:${userId}:${windowId}`;

    const [requestCount, , ttl] = await client
      .multi()
      .incr(key)
      .expire(key, RATE_LIMIT_WINDOW_SECONDS, "NX")
      .ttl(key)
      .exec();

    const count = Number(requestCount);
    const retryAfter = Number(ttl);

    if (count <= RATE_LIMIT_REQUESTS) {
      return { allowed: true, retryAfter: null };
    }

    return {
      allowed: false,
      retryAfter: retryAfter > 0 ? retryAfter : RATE_LIMIT_WINDOW_SECONDS,
    };
  } catch (error) {
    console.error("Redis rate limit check failed:", error);
    return { allowed: true, retryAfter: null };
  }
};

const parseSearchParams = (searchParams: URLSearchParams) => {
  const duplicateKeys = Array.from(new Set(searchParams.keys())).filter(
    (key) => searchParams.getAll(key).length > 1,
  );
  if (duplicateKeys.length > 0) {
    return {
      success: false as const,
      duplicateKeys,
    };
  }

  return querySchema.safeParse(Object.fromEntries(searchParams));
};

export const GET = async (request: NextRequest) => {
  let verifiedUser: Awaited<ReturnType<typeof verifyDesktopJwt>>;
  try {
    verifiedUser = await verifyDesktopJwt(request.headers.get("Authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: verifiedUser.userId },
    select: { isActive: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(verifiedUser.userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
        },
      },
    );
  }

  const parsedParams = parseSearchParams(request.nextUrl.searchParams);
  if (!parsedParams.success) {
    const details =
      "duplicateKeys" in parsedParams
        ? {
            query: [
              `Duplicate query parameters: ${parsedParams.duplicateKeys.join(", ")}`,
            ],
          }
        : parsedParams.error.flatten();

    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details,
      },
      { status: 400 },
    );
  }

  const { from, to, mcpServerId, limit, cursor } = parsedParams.data;
  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  if (cursor && !decodedCursor) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: { cursor: ["Invalid cursor"] },
      },
      { status: 400 },
    );
  }
  if (decodedCursor) {
    const cursorOccurredAt = new Date(decodedCursor.occurredAt);
    // `from` と同時刻のcursorは同時刻内の `id` タイブレークで継続できるため許可する。
    const isOutsideRequestedRange =
      (from ? cursorOccurredAt < new Date(from) : false) ||
      (to ? cursorOccurredAt > new Date(to) : false);
    if (isOutsideRequestedRange) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: { cursor: ["Cursor is outside the requested time range"] },
        },
        { status: 400 },
      );
    }
  }

  const baseWhere = {
    userId: verifiedUser.userId,
    ...(mcpServerId ? { mcpServerId } : {}),
    ...((from ?? to) && {
      occurredAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    }),
  };

  const where = {
    ...baseWhere,
    ...(decodedCursor && {
      OR: [
        { occurredAt: { lt: new Date(decodedCursor.occurredAt) } },
        {
          occurredAt: new Date(decodedCursor.occurredAt),
          id: { lt: decodedCursor.id },
        },
      ],
    }),
  };

  try {
    const [items, total] = await Promise.all([
      db.desktopAuditLog.findMany({
        where,
        // 同一ミリ秒のログが複数ある場合、DB文字列順の `id` を決定論的なタイブレーカーにする。
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: {
          id: true,
          sourceInstallationId: true,
          sourceAuditLogId: true,
          mcpServerId: true,
          connectionName: true,
          clientName: true,
          clientVersion: true,
          transportType: true,
          toolName: true,
          method: true,
          httpStatus: true,
          durationMs: true,
          inputBytes: true,
          outputBytes: true,
          errorCode: true,
          errorSummary: true,
          occurredAt: true,
          createdAt: true,
        },
      }),
      // totalはページング位置を除いた、フィルタ条件に合致する全件数。
      db.desktopAuditLog.count({ where: baseWhere }),
    ]);

    const pageItems = items.slice(0, limit);
    const lastItem = pageItems.at(-1);
    const nextCursor =
      items.length > limit && lastItem
        ? encodeCursor({
            occurredAt: lastItem.occurredAt.toISOString(),
            id: lastItem.id,
          })
        : null;

    return NextResponse.json({
      items: pageItems.map((item) => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      nextCursor,
      total,
    });
  } catch (error) {
    console.error("Failed to query desktop audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

export const dynamic = "force-dynamic";
