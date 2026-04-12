import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../audit-log.repository");

// テスト対象のインポート（モックの後に行う）
import * as service from "../audit-log.service";
import { getDb } from "../../../shared/db";
import * as repository from "../audit-log.repository";

/** テスト用の監査ログレコードを生成 */
const createMockAuditLog = (
  overrides: Partial<{
    id: number;
    toolName: string;
    isSuccess: boolean;
    createdAt: Date;
  }> = {},
) => ({
  id: overrides.id ?? 1,
  toolName: overrides.toolName ?? "test_tool",
  method: "tools/call",
  transportType: "STDIO" as const,
  durationMs: 150,
  inputBytes: 100,
  outputBytes: 200,
  isSuccess: overrides.isSuccess ?? true,
  errorCode: null,
  errorSummary: null,
  detail: null,
  createdAt: overrides.createdAt ?? new Date("2026-04-01T10:00:00.000Z"),
  serverId: 1,
  connectionName: "conn-1",
});

describe("audit-log.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("listByServer", () => {
    /** 各テストで共通のaggregate モック設定 */
    const setupAggregateMock = (successCount = 2, avgDurationMs = 150) => {
      vi.mocked(repository.aggregateByServer).mockResolvedValue({
        successCount,
        avgDurationMs,
      });
    };

    test("監査ログ一覧を取得しDate→string変換する", async () => {
      const records = [
        createMockAuditLog({ id: 2 }),
        createMockAuditLog({ id: 1 }),
      ];
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(2);
      setupAggregateMock(2, 150);

      const result = await service.listByServer({ serverId: 1 });

      expect(result).toStrictEqual({
        items: [
          expect.objectContaining({
            id: 2,
            createdAt: "2026-04-01T10:00:00.000Z",
          }),
          expect.objectContaining({
            id: 1,
            createdAt: "2026-04-01T10:00:00.000Z",
          }),
        ],
        totalCount: 2,
        totalPages: 1,
        currentPage: 1,
        successRate: 100,
        avgDurationMs: 150,
      });
    });

    test("複数ページある場合にtotalPagesを正しく返す", async () => {
      const records = Array.from({ length: 20 }, (_, i) =>
        createMockAuditLog({ id: 20 - i }),
      );
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(50);
      setupAggregateMock(40, 200);

      const result = await service.listByServer({ serverId: 1 });

      expect(result.items).toHaveLength(20);
      expect(result.totalPages).toBe(3);
      expect(result.currentPage).toBe(1);
      expect(result.totalCount).toBe(50);
      expect(result.successRate).toBe(80);
      expect(result.avgDurationMs).toBe(200);
    });

    test("2ページ目を取得する", async () => {
      const records = Array.from({ length: 20 }, (_, i) =>
        createMockAuditLog({ id: 40 - i }),
      );
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(50);
      setupAggregateMock();

      const result = await service.listByServer({ serverId: 1, page: 2 });

      expect(result.currentPage).toBe(2);
      expect(repository.findByServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ skip: 20, take: 20 }),
      );
    });

    test("空結果の場合", async () => {
      vi.mocked(repository.findByServer).mockResolvedValue([]);
      vi.mocked(repository.countByServer).mockResolvedValue(0);
      setupAggregateMock(0, 0);

      const result = await service.listByServer({ serverId: 1 });

      expect(result).toStrictEqual({
        items: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        successRate: 0,
        avgDurationMs: 0,
      });
    });

    test("フィルター条件をrepositoryに渡す", async () => {
      vi.mocked(repository.findByServer).mockResolvedValue([]);
      vi.mocked(repository.countByServer).mockResolvedValue(0);
      setupAggregateMock(0, 0);

      await service.listByServer({
        serverId: 1,
        statusFilter: "error",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-07",
        perPage: 10,
      });

      expect(repository.findByServer).toHaveBeenCalledWith(mockDb, {
        serverId: 1,
        skip: 0,
        take: 10,
        statusFilter: "error",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-07",
      });
      expect(repository.countByServer).toHaveBeenCalledWith(mockDb, {
        serverId: 1,
        statusFilter: "error",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-07",
      });
    });
  });

  describe("recordToolCall", () => {
    test("監査ログをDBに記録する", async () => {
      vi.mocked(repository.create).mockResolvedValue(undefined as never);

      const input = {
        toolName: "test_tool",
        method: "tools/call",
        transportType: "STDIO" as const,
        durationMs: 100,
        inputBytes: 50,
        outputBytes: 200,
        isSuccess: true,
        errorCode: null,
        errorSummary: null,
        serverId: 1,
        connectionName: "conn-1",
      };

      await service.recordToolCall(input);

      expect(repository.create).toHaveBeenCalledWith(mockDb, input);
    });

    test("DB記録失敗時に例外を投げない", async () => {
      vi.mocked(repository.create).mockRejectedValue(new Error("DB error"));

      await expect(
        service.recordToolCall({
          toolName: "test_tool",
          method: "tools/call",
          transportType: "STDIO",
          durationMs: 100,
          inputBytes: 50,
          outputBytes: 200,
          isSuccess: true,
          errorCode: null,
          errorSummary: null,
          serverId: 1,
          connectionName: "conn-1",
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("recordMcpToolCall", () => {
    test("プレフィックス付きツール名を解決してログを記録する", async () => {
      const mockConnection = {
        serverId: 1,
        name: "figma-mcp",
        transportType: "STREAMABLE_HTTP" as const,
      };
      const mockFindFirst = vi.fn().mockResolvedValue(mockConnection);
      vi.mocked(getDb).mockResolvedValue({
        mcpConnection: { findFirst: mockFindFirst },
      } as never);
      vi.mocked(repository.create).mockResolvedValue(undefined as never);

      await service.recordMcpToolCall({
        prefixedToolName: "figma-mcp__get_file",
        durationMs: 320,
        inputBytes: 128,
        outputBytes: 4096,
        isSuccess: true,
        errorMessage: null,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toolName: "get_file",
          connectionName: "figma-mcp",
          serverId: 1,
          transportType: "STREAMABLE_HTTP",
        }),
      );
    });

    test("プレフィックスなしのツール名は記録しない", async () => {
      await service.recordMcpToolCall({
        prefixedToolName: "no_prefix_tool",
        durationMs: 100,
        inputBytes: 50,
        outputBytes: 200,
        isSuccess: true,
        errorMessage: null,
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    test("接続が見つからない場合は記録しない", async () => {
      const mockFindFirst = vi.fn().mockResolvedValue(null);
      vi.mocked(getDb).mockResolvedValue({
        mcpConnection: { findFirst: mockFindFirst },
      } as never);

      await service.recordMcpToolCall({
        prefixedToolName: "unknown__tool",
        durationMs: 100,
        inputBytes: 50,
        outputBytes: 200,
        isSuccess: true,
        errorMessage: null,
      });

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("clearOldLogs", () => {
    test("7日以上古いログを削除する", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      vi.setSystemTime(new Date("2026-04-10T00:00:00.000Z"));

      vi.mocked(repository.deleteOlderThan).mockResolvedValue(5);

      const result = await service.clearOldLogs();

      expect(result).toStrictEqual({ deletedCount: 5 });
      expect(repository.deleteOlderThan).toHaveBeenCalledWith(
        mockDb,
        new Date("2026-04-03T00:00:00.000Z"),
      );

      vi.useRealTimers();
    });
  });

  describe("startAutoCleanup / stopAutoCleanup", () => {
    afterEach(() => {
      service.stopAutoCleanup();
      vi.useRealTimers();
    });

    test("二重呼び出しでもタイマーは1つのみ", () => {
      service.startAutoCleanup();
      service.startAutoCleanup();

      service.stopAutoCleanup();
      // 2回目のstopAutoCleanupでエラーにならない
      service.stopAutoCleanup();
    });
  });
});
