import { describe, test, expect, beforeEach, vi } from "vitest";
import { AuditLogSyncStatus } from "@prisma/desktop-client";

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
    clientName: string | null;
    clientVersion: string | null;
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
  piiDetections: null,
  piiPolicy: null,
  syncStatus: AuditLogSyncStatus.PENDING,
  syncedAt: null,
  retryCount: 0,
  lastSyncTriedAt: null,
  createdAt: overrides.createdAt ?? new Date("2026-04-01T10:00:00.000Z"),
  serverId: 1,
  connectionName: "conn-1",
  clientName: overrides.clientName ?? null,
  clientVersion: overrides.clientVersion ?? null,
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
        overallCount: 2,
        successRate: 100,
        avgDurationMs: 150,
      });
    });

    test("AIクライアント情報を含むレコードを正しく変換する", async () => {
      const records = [
        createMockAuditLog({
          id: 1,
          clientName: "claude-code",
          clientVersion: "1.0.0",
        }),
      ];
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(1);
      setupAggregateMock(1, 150);

      const result = await service.listByServer({ serverId: 1 });

      expect(result.items[0]).toStrictEqual(
        expect.objectContaining({
          clientName: "claude-code",
          clientVersion: "1.0.0",
        }),
      );
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
      expect(result.overallCount).toBe(50);
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
        overallCount: 0,
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

  describe("listAll", () => {
    const setupAggregateMock = (successCount = 2, avgDurationMs = 150) => {
      vi.mocked(repository.aggregateAll).mockResolvedValue({
        successCount,
        avgDurationMs,
      });
    };

    test("全サーバー横断で監査ログ一覧を取得しDate→string変換する", async () => {
      const records = [
        createMockAuditLog({ id: 2 }),
        createMockAuditLog({ id: 1 }),
      ];
      vi.mocked(repository.findAll).mockResolvedValue(records);
      vi.mocked(repository.countAll).mockResolvedValue(2);
      setupAggregateMock(2, 150);

      const result = await service.listAll({});

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
        overallCount: 2,
        successRate: 100,
        avgDurationMs: 150,
      });
    });

    test("serverIdなしでrepositoryを呼び出す", async () => {
      vi.mocked(repository.findAll).mockResolvedValue([]);
      vi.mocked(repository.countAll).mockResolvedValue(0);
      setupAggregateMock(0, 0);

      await service.listAll({});

      expect(repository.findAll).toHaveBeenCalledWith(mockDb, {
        skip: 0,
        take: 20,
        statusFilter: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      });
    });

    test("フィルター条件をrepositoryに渡す", async () => {
      vi.mocked(repository.findAll).mockResolvedValue([]);
      vi.mocked(repository.countAll).mockResolvedValue(0);
      setupAggregateMock(0, 0);

      await service.listAll({
        statusFilter: "error",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-07",
        perPage: 10,
      });

      expect(repository.findAll).toHaveBeenCalledWith(mockDb, {
        skip: 0,
        take: 10,
        statusFilter: "error",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-07",
      });
      expect(repository.countAll).toHaveBeenCalledWith(mockDb, {
        statusFilter: "error",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-07",
      });
    });

    test("空結果の場合", async () => {
      vi.mocked(repository.findAll).mockResolvedValue([]);
      vi.mocked(repository.countAll).mockResolvedValue(0);
      setupAggregateMock(0, 0);

      const result = await service.listAll({});

      expect(result).toStrictEqual({
        items: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        overallCount: 0,
        successRate: 0,
        avgDurationMs: 0,
      });
    });
  });
});
