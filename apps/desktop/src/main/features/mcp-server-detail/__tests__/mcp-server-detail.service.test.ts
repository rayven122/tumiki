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
vi.mock("../mcp-server-detail.repository");

// テスト対象のインポート（モックの後に行う）
import * as service from "../mcp-server-detail.service";
import { getDb } from "../../../shared/db";
import * as repository from "../mcp-server-detail.repository";

describe("mcp-server-detail.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("getServerDetail", () => {
    test("サーバー詳細を取得しDate→string変換する", async () => {
      const createdAt = new Date("2026-04-01T00:00:00.000Z");
      const updatedAt = new Date("2026-04-02T00:00:00.000Z");
      const toolCreatedAt = new Date("2026-04-01T12:00:00.000Z");
      const toolUpdatedAt = new Date("2026-04-01T12:00:00.000Z");

      vi.mocked(repository.findByIdWithDetails).mockResolvedValue({
        id: 1,
        name: "Test Server",
        slug: "test-server",
        description: "テストサーバー",
        serverStatus: "RUNNING",
        isEnabled: true,
        displayOrder: 0,
        createdAt,
        updatedAt,
        connections: [
          {
            id: 10,
            name: "Connection 1",
            slug: "conn-1",
            transportType: "STDIO",
            command: "npx",
            args: '["test"]',
            url: null,
            credentials: "{}",
            authType: "NONE",
            isEnabled: true,
            displayOrder: 0,
            catalogId: null,
            serverId: 1,
            createdAt,
            updatedAt,
            catalog: null,
            tools: [
              {
                id: 100,
                name: "test_tool",
                description: "テストツール",
                inputSchema: "{}",
                customName: null,
                customDescription: null,
                isAllowed: true,
                connectionId: 10,
                createdAt: toolCreatedAt,
                updatedAt: toolUpdatedAt,
              },
            ],
          },
        ],
      } as Awaited<ReturnType<typeof repository.findByIdWithDetails>>);

      const result = await service.getServerDetail(1);

      expect(result).toStrictEqual({
        id: 1,
        name: "Test Server",
        slug: "test-server",
        description: "テストサーバー",
        serverStatus: "RUNNING",
        isEnabled: true,
        displayOrder: 0,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        connections: [
          {
            id: 10,
            name: "Connection 1",
            slug: "conn-1",
            transportType: "STDIO",
            command: "npx",
            args: '["test"]',
            url: null,
            credentials: "{}",
            authType: "NONE",
            isEnabled: true,
            catalogId: null,
            createdAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-02T00:00:00.000Z",
            catalog: null,
            tools: [
              {
                id: 100,
                name: "test_tool",
                description: "テストツール",
                inputSchema: "{}",
                customName: null,
                customDescription: null,
                isAllowed: true,
                connectionId: 10,
                createdAt: "2026-04-01T12:00:00.000Z",
                updatedAt: "2026-04-01T12:00:00.000Z",
              },
            ],
          },
        ],
      });
      expect(repository.findByIdWithDetails).toHaveBeenCalledWith(mockDb, 1);
    });

    test("存在しないIDの場合nullを返す", async () => {
      vi.mocked(repository.findByIdWithDetails).mockResolvedValue(null);

      const result = await service.getServerDetail(999);

      expect(result).toBeNull();
      expect(repository.findByIdWithDetails).toHaveBeenCalledWith(mockDb, 999);
    });
  });
});
