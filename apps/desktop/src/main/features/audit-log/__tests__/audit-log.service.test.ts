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
        nextCursor: null,
        totalCount: 2,
      });
    });

    test("limit+1件取得時にnextCursorを返す", async () => {
      // デフォルトlimit=20 → 21件返すと次ページあり
      const records = Array.from({ length: 21 }, (_, i) =>
        createMockAuditLog({
          id: 21 - i,
          createdAt: new Date(
            `2026-04-01T${String(23 - i).padStart(2, "0")}:00:00.000Z`,
          ),
        }),
      );
      vi.mocked(repository.findByServer).mockResolvedValue(records);
      vi.mocked(repository.countByServer).mockResolvedValue(30);

      const result = await service.listByServer({ serverId: 1 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toStrictEqual({
        createdAt: records[19]!.createdAt.toISOString(),
        id: records[19]!.id,
      });
      expect(result.totalCount).toBe(30);
    });

    test("空結果の場合", async () => {
      vi.mocked(repository.findByServer).mockResolvedValue([]);
      vi.mocked(repository.countByServer).mockResolvedValue(0);

      const result = await service.listByServer({ serverId: 1 });

      expect(result).toStrictEqual({
        items: [],
        nextCursor: null,
        totalCount: 0,
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
        limit: 10,
      });

      expect(repository.findByServer).toHaveBeenCalledWith(mockDb, {
        serverId: 1,
        cursor: undefined,
        limit: 10,
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

    test("カーソル指定でrepositoryに渡す", async () => {
      vi.mocked(repository.findByServer).mockResolvedValue([]);
      vi.mocked(repository.countByServer).mockResolvedValue(0);

      const cursor = { createdAt: "2026-04-01T10:00:00.000Z", id: 5 };
      await service.listByServer({ serverId: 1, cursor });

      expect(repository.findByServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ cursor }),
      );
    });
  });
});
