import { describe, test, expect, beforeEach, vi } from "vitest";

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
    test("監査ログ一覧を取得しDate→string変換する", async () => {
      const records = [
        createMockAuditLog({ id: 2 }),
        createMockAuditLog({ id: 1 }),
      ];
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(2);

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
      });
    });

    test("複数ページある場合にtotalPagesを正しく返す", async () => {
      const records = Array.from({ length: 20 }, (_, i) =>
        createMockAuditLog({ id: 20 - i }),
      );
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(50);

      const result = await service.listByServer({ serverId: 1 });

      expect(result.items).toHaveLength(20);
      expect(result.totalPages).toBe(3);
      expect(result.currentPage).toBe(1);
      expect(result.totalCount).toBe(50);
    });

    test("2ページ目を取得する", async () => {
      const records = Array.from({ length: 20 }, (_, i) =>
        createMockAuditLog({ id: 40 - i }),
      );
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(50);

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

      const result = await service.listByServer({ serverId: 1 });

      expect(result).toStrictEqual({
        items: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });
    });

    test("フィルター条件をrepositoryに渡す", async () => {
      vi.mocked(repository.findByServer).mockResolvedValue([]);
      vi.mocked(repository.countByServer).mockResolvedValue(0);

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
});
