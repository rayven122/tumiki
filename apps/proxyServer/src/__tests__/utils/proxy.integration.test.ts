/**
 * @fileoverview proxy.ts の統合テスト（多対多関係のキャッシュ動作検証）
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "@tumiki/db/tcp";
import {
  getServerConfigsByInstanceId,
  invalidateConfigCache,
  clearAllCaches,
} from "../../utils/proxy.js";
import {
  createMockServerInstance,
  createMockServerConfig,
  createMockConfigMetadata,
} from "../helpers/mockFactories.js";

// Prismaクライアントのモック
vi.mock("@tumiki/db/tcp", () => ({
  db: {
    userMcpServerInstance: {
      findUnique: vi.fn(),
    },
    userMcpServerConfig: {
      findMany: vi.fn(),
    },
  },
}));

describe("getServerConfigsByInstanceId 統合テスト", () => {
  const mockInstanceId = "test-instance-123";
  const mockConfigId1 = "config-1";
  const mockConfigId2 = "config-2";
  const mockUpdatedAt1 = new Date("2024-01-01T00:00:00Z");
  const mockUpdatedAt2 = new Date("2024-01-02T00:00:00Z");

  const mockServerInstance = createMockServerInstance({
    id: mockInstanceId,
    name: "Test Instance",
    organizationId: "org-1",
    description: "Test Description",
    iconPath: null,
    serverStatus: "RUNNING",
    serverType: "CUSTOM",
    toolGroupId: "tool-group-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    toolGroup: {
      id: "tool-group-1",
      toolGroupTools: [
        {
          userMcpServerConfigId: mockConfigId1,
          tool: { id: "tool-1", name: "Tool 1" },
        },
        {
          userMcpServerConfigId: mockConfigId2,
          tool: { id: "tool-2", name: "Tool 2" },
        },
      ],
    },
  });

  const mockServerConfigs = [
    createMockServerConfig({
      id: mockConfigId1,
      organizationId: "org-1",
      name: "Config 1",
      description: "Test Config 1",
      createdAt: new Date(),
      updatedAt: mockUpdatedAt1,
      envVars: "{}",
      oauthConnection: null,
      mcpServerId: "mcp-1",
      mcpServer: {
        command: "node",
        args: ["server1.js"],
      },
    }),
    createMockServerConfig({
      id: mockConfigId2,
      organizationId: "org-1",
      name: "Config 2",
      description: "Test Config 2",
      createdAt: new Date(),
      updatedAt: mockUpdatedAt2,
      envVars: "{}",
      oauthConnection: null,
      mcpServerId: "mcp-2",
      mcpServer: {
        command: "node",
        args: ["server2.js"],
      },
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // すべてのキャッシュをクリア
    clearAllCaches();
  });

  describe("キャッシュヒット動作", () => {
    test("初回アクセス時はDBから取得してキャッシュに保存", async () => {
      // DBレスポンスのモック
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        mockServerInstance,
      );
      vi.mocked(db.userMcpServerConfig.findMany).mockResolvedValue(
        createMockConfigMetadata([
          { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
          { id: mockConfigId2, updatedAt: mockUpdatedAt2 },
        ]),
      );
      vi.mocked(db.userMcpServerConfig.findMany).mockResolvedValue(
        mockServerConfigs,
      );

      // 初回呼び出し
      const result1 = await getServerConfigsByInstanceId(mockInstanceId);

      // DBが呼ばれたことを確認
      expect(db.userMcpServerInstance.findUnique).toHaveBeenCalledTimes(1);
      expect(db.userMcpServerConfig.findMany).toHaveBeenCalledTimes(2);
      expect(result1).toHaveLength(2);
    });

    test("2回目のアクセスではキャッシュから取得（DB呼び出しなし）", async () => {
      // 初回アクセス（キャッシュに保存）
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        mockServerInstance,
      );
      vi.mocked(db.userMcpServerConfig.findMany)
        .mockResolvedValueOnce(
          createMockConfigMetadata([
            { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
            { id: mockConfigId2, updatedAt: mockUpdatedAt2 },
          ]),
        )
        .mockResolvedValueOnce(mockServerConfigs);

      await getServerConfigsByInstanceId(mockInstanceId);
      vi.clearAllMocks();

      // 2回目のアクセス（同じメタデータ）
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        mockServerInstance,
      );
      vi.mocked(db.userMcpServerConfig.findMany).mockResolvedValueOnce(
        createMockConfigMetadata([
          { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
          { id: mockConfigId2, updatedAt: mockUpdatedAt2 },
        ]),
      );

      const result2 = await getServerConfigsByInstanceId(mockInstanceId);

      // メタデータ取得のためのDB呼び出しのみ
      expect(db.userMcpServerInstance.findUnique).toHaveBeenCalledTimes(1);
      expect(db.userMcpServerConfig.findMany).toHaveBeenCalledTimes(1);
      expect(result2).toHaveLength(2);
    });
  });

  describe("キャッシュ無効化", () => {
    test("Configが更新された場合、キャッシュが無効化される", async () => {
      // 初回アクセス
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(
        mockServerInstance,
      );
      vi.mocked(db.userMcpServerConfig.findMany)
        .mockResolvedValueOnce(
          createMockConfigMetadata([
            { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
            { id: mockConfigId2, updatedAt: mockUpdatedAt2 },
          ]),
        )
        .mockResolvedValueOnce(mockServerConfigs);

      await getServerConfigsByInstanceId(mockInstanceId);
      vi.clearAllMocks();

      // Config2が更新された場合
      const updatedMockUpdatedAt2 = new Date("2024-01-03T00:00:00Z");
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(
        mockServerInstance,
      );
      vi.mocked(db.userMcpServerConfig.findMany)
        .mockResolvedValueOnce(
          createMockConfigMetadata([
            { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
            { id: mockConfigId2, updatedAt: updatedMockUpdatedAt2 },
          ]),
        )
        .mockResolvedValueOnce([
          mockServerConfigs[0]!,
          createMockServerConfig({
            ...mockServerConfigs[1]!,
            updatedAt: updatedMockUpdatedAt2,
          }),
        ]);

      const result = await getServerConfigsByInstanceId(mockInstanceId);

      // updatedAtが変わったため、DBから再取得される
      expect(db.userMcpServerConfig.findMany).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    test("invalidateConfigCache呼び出し後はキャッシュから削除される", async () => {
      // 初回アクセス（キャッシュに保存）
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(
        mockServerInstance,
      );
      vi.mocked(db.userMcpServerConfig.findMany)
        .mockResolvedValueOnce(
          createMockConfigMetadata([
            { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
            { id: mockConfigId2, updatedAt: mockUpdatedAt2 },
          ]),
        )
        .mockResolvedValueOnce(mockServerConfigs);

      await getServerConfigsByInstanceId(mockInstanceId);
      vi.clearAllMocks();

      // キャッシュを無効化
      invalidateConfigCache(mockInstanceId);

      // 再度アクセス
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(
        mockServerInstance,
      );
      vi.mocked(db.userMcpServerConfig.findMany)
        .mockResolvedValueOnce(
          createMockConfigMetadata([
            { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
            { id: mockConfigId2, updatedAt: mockUpdatedAt2 },
          ]),
        )
        .mockResolvedValueOnce(mockServerConfigs);

      const result = await getServerConfigsByInstanceId(mockInstanceId);

      // DBから再取得される
      expect(db.userMcpServerInstance.findUnique).toHaveBeenCalledTimes(1);
      expect(db.userMcpServerConfig.findMany).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  describe("ネガティブキャッシュ", () => {
    test("存在しないインスタンスIDはネガティブキャッシュに保存される", async () => {
      // 初回アクセス（存在しない）
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        null,
      );

      await expect(
        getServerConfigsByInstanceId("non-existent-id"),
      ).rejects.toThrow("Server instance not found");

      expect(db.userMcpServerInstance.findUnique).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();

      // 2回目のアクセス（ネガティブキャッシュから）
      await expect(
        getServerConfigsByInstanceId("non-existent-id"),
      ).rejects.toThrow("Server instance not found (cached)");

      // DBは呼ばれない
      expect(db.userMcpServerInstance.findUnique).not.toHaveBeenCalled();
    });

    test("invalidateConfigCacheでネガティブキャッシュも削除される", async () => {
      // 存在しないIDでエラー
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        null,
      );
      await expect(
        getServerConfigsByInstanceId("non-existent-id"),
      ).rejects.toThrow();

      // キャッシュを無効化
      invalidateConfigCache("non-existent-id");
      vi.clearAllMocks();

      // 再度アクセス（DBから確認）
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        null,
      );
      await expect(
        getServerConfigsByInstanceId("non-existent-id"),
      ).rejects.toThrow("Server instance not found");

      // DBが呼ばれることを確認
      expect(db.userMcpServerInstance.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe("多対多関係のシナリオ", () => {
    test("同じConfigが複数のインスタンスで使用される場合でも正しくキャッシュされる", async () => {
      const instance1 = "instance-1";
      const instance2 = "instance-2";
      const sharedConfigId = "shared-config";

      // キャッシュをクリア
      invalidateConfigCache(instance1);
      invalidateConfigCache(instance2);

      // Instance1の設定
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        createMockServerInstance({
          id: instance1,
          toolGroup: {
            id: "tool-group-shared",
            toolGroupTools: [
              {
                userMcpServerConfigId: sharedConfigId,
                tool: { id: "tool-shared", name: "SharedTool" },
              },
            ],
          },
        }),
      );
      vi.mocked(db.userMcpServerConfig.findMany)
        .mockResolvedValueOnce(
          createMockConfigMetadata([
            { id: sharedConfigId, updatedAt: mockUpdatedAt1 },
          ]),
        )
        .mockResolvedValueOnce([
          createMockServerConfig({
            id: sharedConfigId,
            name: "Shared Config",
            envVars: "{}",
            mcpServer: { command: "node", args: [] },
          }),
        ]);

      const result1 = await getServerConfigsByInstanceId(instance1);
      expect(result1).toHaveLength(1);
      vi.clearAllMocks();

      // Instance2の設定（同じsharedConfigを使用）
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValueOnce(
        createMockServerInstance({
          id: instance2,
          toolGroup: {
            id: "tool-group-multi",
            toolGroupTools: [
              {
                userMcpServerConfigId: sharedConfigId,
                tool: { id: "tool-shared", name: "SharedTool" },
              },
              {
                userMcpServerConfigId: mockConfigId1,
                tool: { id: "tool-1", name: "Tool1" },
              },
            ],
          },
        }),
      );
      vi.mocked(db.userMcpServerConfig.findMany)
        .mockResolvedValueOnce(
          createMockConfigMetadata([
            { id: sharedConfigId, updatedAt: mockUpdatedAt1 },
            { id: mockConfigId1, updatedAt: mockUpdatedAt1 },
          ]),
        )
        .mockResolvedValueOnce([
          createMockServerConfig({
            id: sharedConfigId,
            name: "Shared Config",
            envVars: "{}",
            mcpServer: { command: "node", args: [] },
          }),
          mockServerConfigs[0]!,
        ]);

      const result2 = await getServerConfigsByInstanceId(instance2);
      expect(result2).toHaveLength(2);

      // 両方のインスタンスは独立してキャッシュされる
      expect(db.userMcpServerInstance.findUnique).toHaveBeenCalledTimes(1);
      expect(db.userMcpServerConfig.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
