import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCount = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());
const mockRedisMulti = vi.hoisted(() => ({
  exec: vi.fn(),
  expire: vi.fn(),
  incr: vi.fn(),
  ttl: vi.fn(),
}));
const mockRedisClient = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  multi: vi.fn(),
  on: vi.fn(),
}));

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    desktopAuditLog: {
      findMany: mockFindMany,
      count: mockCount,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("~/lib/auth/verify-desktop-jwt", () => ({
  verifyDesktopJwt: mockVerifyDesktopJwt,
}));

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

import { GET } from "./route";

const auditLog = {
  id: "log-002",
  sourceInstallationId: "installation-001",
  sourceAuditLogId: 10,
  mcpServerId: "github",
  connectionName: "GitHub",
  clientName: "Claude Code",
  clientVersion: "1.2.3",
  transportType: "STDIO",
  toolName: "list_repos",
  method: "tools/call",
  httpStatus: 200,
  durationMs: 342,
  inputBytes: 50,
  outputBytes: 1200,
  errorCode: null,
  errorSummary: null,
  occurredAt: new Date("2026-05-03T10:00:00.000Z"),
  createdAt: new Date("2026-05-03T10:00:01.000Z"),
};

const buildRequest = (query = "") =>
  new NextRequest(
    `https://manager.example.com/api/desktop/v1/audit-logs${query}`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer access-token",
      },
    },
  );

const encodeCursor = (payload: { occurredAt: string; id: string }) =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

describe("GET /api/desktop/v1/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.REDIS_URL;
    mockVerifyDesktopJwt.mockResolvedValue({ userId: "user-001" });
    mockUserFindUnique.mockResolvedValue({ isActive: true });
    mockFindMany.mockResolvedValue([auditLog]);
    mockCount.mockResolvedValue(1);
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.disconnect.mockResolvedValue(undefined);
    mockRedisClient.multi.mockReturnValue(mockRedisMulti);
    mockRedisMulti.exec.mockResolvedValue([1, true, 60]);
    mockRedisMulti.expire.mockReturnValue(mockRedisMulti);
    mockRedisMulti.incr.mockReturnValue(mockRedisMulti);
    mockRedisMulti.ttl.mockReturnValue(mockRedisMulti);
  });

  test("認証ユーザーの監査ログを新しい順に検索する", async () => {
    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      items: [
        {
          ...auditLog,
          occurredAt: "2026-05-03T10:00:00.000Z",
          createdAt: "2026-05-03T10:00:01.000Z",
        },
      ],
      nextCursor: null,
      total: 1,
    });
    expect(response.status).toStrictEqual(200);
    expect(mockVerifyDesktopJwt).toHaveBeenCalledWith("Bearer access-token");
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user-001",
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 101,
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
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        userId: "user-001",
      },
    });
  });

  test("期間、MCPサーバー、limitで絞り込む", async () => {
    const response = await GET(
      buildRequest(
        "?from=2026-05-01T00%3A00%3A00.000Z&to=2026-05-04T00%3A00%3A00.000Z&mcpServerId=github&limit=50",
      ),
    );

    expect(response.status).toStrictEqual(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-001",
          mcpServerId: "github",
          occurredAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lte: new Date("2026-05-04T00:00:00.000Z"),
          },
        },
        take: 51,
      }),
    );
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        userId: "user-001",
        mcpServerId: "github",
        occurredAt: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lte: new Date("2026-05-04T00:00:00.000Z"),
        },
      },
    });
  });

  test("次ページがある場合はopaque cursorを返す", async () => {
    mockFindMany.mockResolvedValue([
      auditLog,
      {
        ...auditLog,
        id: "log-001",
        occurredAt: new Date("2026-05-03T09:00:00.000Z"),
      },
    ]);

    const response = await GET(buildRequest("?limit=1"));
    const body = (await response.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };

    expect(response.status).toStrictEqual(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.id).toStrictEqual("log-002");
    expect(body.nextCursor).toStrictEqual(
      encodeCursor({
        occurredAt: "2026-05-03T10:00:00.000Z",
        id: "log-002",
      }),
    );
  });

  test("検索結果がlimitと同数の場合はnextCursorがnullになる", async () => {
    mockFindMany.mockResolvedValue([auditLog]);

    const response = await GET(buildRequest("?limit=1"));
    const body = (await response.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };

    expect(response.status).toStrictEqual(200);
    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toStrictEqual(null);
  });

  test("cursor指定時は続きから検索する", async () => {
    const cursor = encodeCursor({
      occurredAt: "2026-05-03T10:00:00.000Z",
      id: "log-002",
    });

    const response = await GET(buildRequest(`?cursor=${cursor}`));

    expect(response.status).toStrictEqual(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-001",
          OR: [
            {
              occurredAt: {
                lt: new Date("2026-05-03T10:00:00.000Z"),
              },
            },
            {
              occurredAt: new Date("2026-05-03T10:00:00.000Z"),
              id: {
                lt: "log-002",
              },
            },
          ],
        },
      }),
    );
  });

  test("cursor指定時も期間とMCPサーバーの条件を維持する", async () => {
    const cursor = encodeCursor({
      occurredAt: "2026-05-03T10:00:00.000Z",
      id: "log-002",
    });

    const response = await GET(
      buildRequest(
        `?from=2026-05-01T00%3A00%3A00.000Z&to=2026-05-04T00%3A00%3A00.000Z&mcpServerId=github&cursor=${cursor}`,
      ),
    );

    expect(response.status).toStrictEqual(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-001",
          mcpServerId: "github",
          occurredAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lte: new Date("2026-05-04T00:00:00.000Z"),
          },
          OR: [
            {
              occurredAt: {
                lt: new Date("2026-05-03T10:00:00.000Z"),
              },
            },
            {
              occurredAt: new Date("2026-05-03T10:00:00.000Z"),
              id: {
                lt: "log-002",
              },
            },
          ],
        },
      }),
    );
  });

  test("cursorが期間条件の外にある場合は400を返す", async () => {
    const cursor = encodeCursor({
      occurredAt: "2026-05-06T00:00:00.000Z",
      id: "log-002",
    });

    const response = await GET(
      buildRequest(`?to=2026-05-04T00%3A00%3A00.000Z&cursor=${cursor}`),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid query parameters",
      details: { cursor: ["Cursor is outside the requested time range"] },
    });
    expect(response.status).toStrictEqual(400);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  test("cursorのoccurredAtがfromと同時刻の場合は検索できる", async () => {
    const cursor = encodeCursor({
      occurredAt: "2026-05-01T00:00:00.000Z",
      id: "log-002",
    });

    const response = await GET(
      buildRequest(`?from=2026-05-01T00%3A00%3A00.000Z&cursor=${cursor}`),
    );

    expect(response.status).toStrictEqual(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-001",
          occurredAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
          },
          OR: [
            {
              occurredAt: {
                lt: new Date("2026-05-01T00:00:00.000Z"),
              },
            },
            {
              occurredAt: new Date("2026-05-01T00:00:00.000Z"),
              id: {
                lt: "log-002",
              },
            },
          ],
        },
      }),
    );
  });

  test("cursorのoccurredAtがtoと同時刻の場合は検索できる", async () => {
    const cursor = encodeCursor({
      occurredAt: "2026-05-04T00:00:00.000Z",
      id: "log-002",
    });

    const response = await GET(
      buildRequest(`?to=2026-05-04T00%3A00%3A00.000Z&cursor=${cursor}`),
    );

    expect(response.status).toStrictEqual(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-001",
          occurredAt: {
            lte: new Date("2026-05-04T00:00:00.000Z"),
          },
          OR: [
            {
              occurredAt: {
                lt: new Date("2026-05-04T00:00:00.000Z"),
              },
            },
            {
              occurredAt: new Date("2026-05-04T00:00:00.000Z"),
              id: {
                lt: "log-002",
              },
            },
          ],
        },
      }),
    );
  });

  test("認証に失敗した場合は401を返す", async () => {
    mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  test("非アクティブユーザーは401を返す", async () => {
    mockUserFindUnique.mockResolvedValue({ isActive: false });

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user-001" },
      select: { isActive: true },
    });
    expect(mockRedisMulti.exec).not.toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  test("不正なquery parameterは400を返す", async () => {
    const response = await GET(buildRequest("?limit=501"));
    const body = (await response.json()) as {
      error: "Invalid query parameters";
      details: unknown;
    };

    expect(body.error).toStrictEqual("Invalid query parameters");
    expect(body.details).toBeDefined();
    expect(response.status).toStrictEqual(400);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  test("重複したquery parameterは400を返す", async () => {
    const response = await GET(buildRequest("?limit=10&limit=9"));

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid query parameters",
      details: {
        query: ["Duplicate query parameters: limit"],
      },
    });
    expect(response.status).toStrictEqual(400);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  test("fromがtoより後の場合は400を返す", async () => {
    const response = await GET(
      buildRequest(
        "?from=2026-05-05T00%3A00%3A00.000Z&to=2026-05-01T00%3A00%3A00.000Z",
      ),
    );
    const body = (await response.json()) as {
      error: "Invalid query parameters";
      details: unknown;
    };

    expect(body.error).toStrictEqual("Invalid query parameters");
    expect(body.details).toBeDefined();
    expect(response.status).toStrictEqual(400);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  test("不正なcursorは400を返す", async () => {
    const response = await GET(buildRequest("?cursor=not-a-cursor"));

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid query parameters",
      details: { cursor: ["Invalid cursor"] },
    });
    expect(response.status).toStrictEqual(400);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  test("ユーザー単位のレートリミットを超えた場合は429を返す", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    let requestCount = 0;
    mockRedisMulti.exec.mockImplementation(() => {
      requestCount += 1;
      return Promise.resolve([requestCount, true, 60]);
    });
    mockVerifyDesktopJwt.mockResolvedValue({ userId: "rate-limited-user" });
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    for (let i = 0; i < 60; i += 1) {
      const response = await GET(buildRequest());
      expect(response.status).toStrictEqual(200);
    }

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Rate limit exceeded",
    });
    expect(response.status).toStrictEqual(429);
    expect(response.headers.get("Retry-After")).toStrictEqual("60");
    expect(mockRedisMulti.expire).toHaveBeenCalledWith(
      expect.stringMatching(
        /^internal-manager:desktop:v1:audit-logs:rate:rate-limited-user:\d+$/,
      ),
      60,
      "NX",
    );
    expect(mockRedisMulti.ttl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^internal-manager:desktop:v1:audit-logs:rate:rate-limited-user:\d+$/,
      ),
    );
    expect(mockFindMany).toHaveBeenCalledTimes(60);
    expect(mockCount).toHaveBeenCalledTimes(60);
  });

  test("RedisのTTLが取得できない場合はデフォルト秒数をRetry-Afterに返す", async () => {
    process.env.REDIS_URL = "redis://localhost:6381";
    mockRedisMulti.exec.mockResolvedValue([61, true, -1]);
    mockVerifyDesktopJwt.mockResolvedValue({
      userId: "ttl-fallback-rate-limited-user",
    });

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Rate limit exceeded",
    });
    expect(response.status).toStrictEqual(429);
    expect(response.headers.get("Retry-After")).toStrictEqual("60");
    expect(mockRedisMulti.expire).toHaveBeenCalledWith(
      expect.stringMatching(
        /^internal-manager:desktop:v1:audit-logs:rate:ttl-fallback-rate-limited-user:\d+$/,
      ),
      60,
      "NX",
    );
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  test("Redis接続失敗時はレートリミットをスキップして通常レスポンスを返す", async () => {
    process.env.REDIS_URL = "redis://localhost:6380";
    mockRedisClient.connect.mockRejectedValue(new Error("Connection refused"));

    const response = await GET(buildRequest());

    expect(response.status).toStrictEqual(200);
    expect(mockRedisMulti.exec).not.toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockCount).toHaveBeenCalledTimes(1);
  });

  test("DB障害時は500を返す", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Internal server error",
    });
    expect(response.status).toStrictEqual(500);
  });

  test("count失敗時も500を返す", async () => {
    mockCount.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Internal server error",
    });
    expect(response.status).toStrictEqual(500);
  });
});
