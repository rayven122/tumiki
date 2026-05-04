import type { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { describe, expect, test, vi } from "vitest";

import { Role } from "@tumiki/internal-db";
import { type Context } from "../trpc";
import { auditLogsRouter } from "./audit-logs";

vi.mock("server-only", () => ({}));
vi.mock("~/auth", () => ({
  auth: vi.fn(),
}));

const buildSession = (): Session => ({
  user: {
    id: "admin-001",
    sub: "admin-001",
    email: "admin@example.com",
    name: "Admin User",
    image: null,
    role: Role.SYSTEM_ADMIN,
    tumiki: null,
  },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

const buildContext = (
  desktopAuditLog: Context["db"]["desktopAuditLog"],
): Context => ({
  db: {
    desktopAuditLog,
  } as Context["db"],
  headers: new Headers(),
  session: buildSession(),
});

const buildDesktopAuditLogMock = () => ({
  findMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
});

describe("auditLogsRouter", () => {
  test("監査ログをDBから取得してUI向けステータスに変換する", async () => {
    const occurredAt = new Date("2026-05-04T01:00:00.000Z");
    const createdAt = new Date("2026-05-04T01:00:01.000Z");
    const desktopAuditLog = buildDesktopAuditLogMock();
    desktopAuditLog.findMany.mockResolvedValue([
      {
        id: "log-001",
        sourceInstallationId: "installation-001",
        sourceAuditLogId: "source-log-001",
        mcpServerId: "github",
        connectionName: "GitHub",
        clientName: "Claude Code",
        clientVersion: "1.2.3",
        transportType: "STDIO",
        toolName: "create_pr",
        method: "tools/call",
        httpStatus: 200,
        durationMs: 123,
        inputBytes: 100,
        outputBytes: 200,
        errorCode: null,
        errorSummary: null,
        occurredAt,
        createdAt,
        user: {
          id: "user-001",
          name: "Test User",
          email: "user@example.com",
        },
      },
    ]);
    desktopAuditLog.count.mockResolvedValue(1);
    desktopAuditLog.groupBy
      .mockResolvedValueOnce([
        { httpStatus: 200, _count: { _all: 2 } },
        { httpStatus: 403, _count: { _all: 1 } },
        { httpStatus: 500, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([{ mcpServerId: "github", _count: { _all: 1 } }]);

    const caller = auditLogsRouter.createCaller(
      buildContext(
        desktopAuditLog as unknown as Context["db"]["desktopAuditLog"],
      ),
    );

    const result = await caller.list({ limit: 1 });

    expect(desktopAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 2,
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "log-001",
        mcpServerId: "github",
        connectionName: "GitHub",
        clientName: "Claude Code",
        toolName: "create_pr",
        status: "success",
      },
    ]);
    expect(result.summary).toStrictEqual({
      total: 4,
      success: 2,
      blocked: 1,
      error: 1,
    });
    expect(result.mcpServers).toStrictEqual([{ id: "github", count: 1 }]);
  });

  test("フィルタ条件をDB検索に渡す", async () => {
    const desktopAuditLog = buildDesktopAuditLogMock();
    desktopAuditLog.findMany.mockResolvedValue([]);
    desktopAuditLog.count.mockResolvedValue(0);
    desktopAuditLog.groupBy.mockResolvedValue([]);

    const caller = auditLogsRouter.createCaller(
      buildContext(
        desktopAuditLog as unknown as Context["db"]["desktopAuditLog"],
      ),
    );

    await caller.list({
      status: "blocked",
      mcpServerId: "slack",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-04T00:00:00.000Z",
      limit: 50,
    });

    expect(desktopAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          mcpServerId: "slack",
          httpStatus: 403,
          occurredAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lte: new Date("2026-05-04T00:00:00.000Z"),
          },
        },
        take: 51,
      }),
    );
  });

  test("不正なカーソルはBAD_REQUESTを返す", async () => {
    const caller = auditLogsRouter.createCaller(
      buildContext(
        buildDesktopAuditLogMock() as unknown as Context["db"]["desktopAuditLog"],
      ),
    );

    await expect(
      caller.list({ cursor: "invalid-cursor" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST" satisfies TRPCError["code"],
    });
  });
});
