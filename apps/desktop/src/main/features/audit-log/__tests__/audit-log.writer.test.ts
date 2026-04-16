import { afterEach, describe, test, expect, beforeEach, vi } from "vitest";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");

// テスト対象のインポート（モックの後に行う）
import { writeAuditLog, deleteOldAuditLogs } from "../audit-log.writer";
import { getDb } from "../../../shared/db";

describe("audit-log.writer", () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: 1 });
  const mockDeleteMany = vi.fn().mockResolvedValue({ count: 3 });
  const mockDb = {
    auditLog: {
      create: mockCreate,
      deleteMany: mockDeleteMany,
    },
  } as unknown as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    mockCreate.mockResolvedValue({ id: 1 });
    mockDeleteMany.mockResolvedValue({ count: 3 });
  });

  describe("writeAuditLog", () => {
    test("監査ログを1件作成する", async () => {
      const input = {
        toolName: "list_repos",
        method: "tools/call" as const,
        transportType: "STDIO" as const,
        durationMs: 342,
        inputBytes: 50,
        outputBytes: 1200,
        isSuccess: true,
        serverId: 3,
        connectionName: "main",
      };

      await writeAuditLog(input);

      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith({ data: input });
    });

    test("エラー情報付きの監査ログを作成する", async () => {
      const input = {
        toolName: "search",
        method: "tools/call" as const,
        transportType: "STDIO" as const,
        durationMs: 5000,
        inputBytes: 100,
        outputBytes: 0,
        isSuccess: false,
        errorSummary: "connection timeout",
        serverId: 1,
        connectionName: "conn-1",
      };

      await writeAuditLog(input);

      expect(mockCreate).toHaveBeenCalledWith({ data: input });
    });
  });

  describe("deleteOldAuditLogs", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      vi.setSystemTime(new Date("2026-04-15T00:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("デフォルト7日より古いログを削除する", async () => {
      const result = await deleteOldAuditLogs();

      expect(result).toBe(3);
      expect(mockDeleteMany).toHaveBeenCalledOnce();
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: new Date("2026-04-08T00:00:00.000Z") },
        },
      });
    });

    test("カスタム保持日数で古いログを削除する", async () => {
      await deleteOldAuditLogs(3);

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: new Date("2026-04-12T00:00:00.000Z") },
        },
      });
    });
  });
});
