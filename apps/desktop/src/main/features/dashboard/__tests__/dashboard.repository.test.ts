import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));

import {
  findAuditLogsInRange,
  countAuditLogsInRange,
  findRecentAuditLogs,
  findAllConnectors,
} from "../dashboard.repository";
import type { PrismaClient } from "@prisma/desktop-client";

describe("dashboard.repository", () => {
  const mockAuditLogFindMany = vi.fn();
  const mockAuditLogCount = vi.fn();
  const mockMcpConnectionFindMany = vi.fn();

  const mockDb = {
    auditLog: {
      findMany: mockAuditLogFindMany,
      count: mockAuditLogCount,
    },
    mcpConnection: {
      findMany: mockMcpConnectionFindMany,
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAuditLogsInRange", () => {
    test("期間内の監査ログを集計用カラムだけ昇順で取得する", async () => {
      const range = {
        from: new Date("2026-04-25T00:00:00.000Z"),
        to: new Date("2026-04-26T00:00:00.000Z"),
      };
      const expected = [
        {
          id: 1,
          createdAt: new Date("2026-04-25T10:00:00.000Z"),
          connectionName: "Slack",
          toolName: "send_message",
          clientName: "cursor",
          isSuccess: true,
          durationMs: 100,
        },
      ];
      mockAuditLogFindMany.mockResolvedValue(expected);

      const result = await findAuditLogsInRange(mockDb, range);

      expect(result).toStrictEqual(expected);
      expect(mockAuditLogFindMany).toHaveBeenCalledWith({
        where: { createdAt: { gte: range.from, lt: range.to } },
        select: {
          id: true,
          createdAt: true,
          connectionName: true,
          toolName: true,
          clientName: true,
          isSuccess: true,
          durationMs: true,
        },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  describe("countAuditLogsInRange", () => {
    test("期間内の総件数と成功件数を並行で取得する", async () => {
      const range = {
        from: new Date("2026-04-25T00:00:00.000Z"),
        to: new Date("2026-04-26T00:00:00.000Z"),
      };
      mockAuditLogCount.mockResolvedValueOnce(10).mockResolvedValueOnce(7);

      const result = await countAuditLogsInRange(mockDb, range);

      expect(result).toStrictEqual({ total: 10, success: 7 });
      expect(mockAuditLogCount).toHaveBeenNthCalledWith(1, {
        where: { createdAt: { gte: range.from, lt: range.to } },
      });
      expect(mockAuditLogCount).toHaveBeenNthCalledWith(2, {
        where: {
          createdAt: { gte: range.from, lt: range.to },
          isSuccess: true,
        },
      });
    });

    test("ログが0件でも0を返す", async () => {
      mockAuditLogCount.mockResolvedValue(0);

      const result = await countAuditLogsInRange(mockDb, {
        from: new Date(0),
        to: new Date(1),
      });

      expect(result).toStrictEqual({ total: 0, success: 0 });
    });
  });

  describe("findRecentAuditLogs", () => {
    test("指定件数だけ時刻降順・id降順で取得する", async () => {
      const expected = [
        {
          id: 99,
          createdAt: new Date("2026-04-26T11:00:00.000Z"),
          connectionName: "Slack",
          toolName: "send_message",
          clientName: "cursor",
          isSuccess: true,
          durationMs: 50,
        },
      ];
      mockAuditLogFindMany.mockResolvedValue(expected);

      const result = await findRecentAuditLogs(mockDb, 6);

      expect(result).toStrictEqual(expected);
      expect(mockAuditLogFindMany).toHaveBeenCalledWith({
        select: {
          id: true,
          createdAt: true,
          connectionName: true,
          toolName: true,
          clientName: true,
          isSuccess: true,
          durationMs: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 6,
      });
    });
  });

  describe("findAllConnectors", () => {
    test("有効な接続のみをサーバー表示順→接続表示順で取得し、平坦化して返す", async () => {
      mockMcpConnectionFindMany.mockResolvedValue([
        {
          id: 11,
          name: "main",
          displayOrder: 0,
          catalog: { iconPath: "/logos/services/slack.svg" },
          server: { id: 1, serverStatus: "RUNNING", displayOrder: 0 },
        },
        {
          id: 22,
          name: "secondary",
          displayOrder: 1,
          catalog: null,
          server: { id: 2, serverStatus: "STOPPED", displayOrder: 1 },
        },
      ]);

      const result = await findAllConnectors(mockDb);

      expect(result).toStrictEqual([
        {
          serverId: 1,
          connectionId: 11,
          name: "main",
          iconPath: "/logos/services/slack.svg",
          serverStatus: "RUNNING",
        },
        {
          serverId: 2,
          connectionId: 22,
          name: "secondary",
          iconPath: null,
          serverStatus: "STOPPED",
        },
      ]);
      expect(mockMcpConnectionFindMany).toHaveBeenCalledWith({
        where: { isEnabled: true, server: { isEnabled: true } },
        select: {
          id: true,
          name: true,
          displayOrder: true,
          catalog: { select: { iconPath: true } },
          server: {
            select: { id: true, serverStatus: true, displayOrder: true },
          },
        },
        orderBy: [{ server: { displayOrder: "asc" } }, { displayOrder: "asc" }],
      });
    });

    test("コネクタが0件の場合は空配列を返す", async () => {
      mockMcpConnectionFindMany.mockResolvedValue([]);

      const result = await findAllConnectors(mockDb);

      expect(result).toStrictEqual([]);
    });
  });
});
