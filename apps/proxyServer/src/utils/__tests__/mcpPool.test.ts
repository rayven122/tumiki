import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerConfig } from "../../libs/types.js";

// モック設定
vi.mock("../createMCPClient.js", () => ({
  createMCPClient: vi.fn(),
}));

vi.mock("../../libs/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("MCPConnectionPool", () => {
  let mockClient: Client;
  let mockTransport: Transport;
  let mockCleanup: () => Promise<void>;

  beforeEach(async () => {
    // ESモジュールの動的インポートをリセット
    vi.resetModules();

    // モッククライアントの作成
    mockClient = {
      connect: vi.fn(),
      close: vi.fn(),
    } as unknown as Client;

    mockTransport = {
      close: vi.fn(),
    } as unknown as Transport;

    mockCleanup = vi.fn();

    // createMCPClientのモック実装
    const { createMCPClient } = vi.mocked(
      await import("../createMCPClient.js"),
      true,
    );
    vi.mocked(createMCPClient).mockResolvedValue({
      client: mockClient,
      transport: mockTransport,
      credentialsCleanup: mockCleanup,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getConnection", () => {
    test("新規接続を作成する", async () => {
      const { mcpPool } = await import("../mcpPool.js");
      const serverConfig: ServerConfig = {
        name: "test-server",
        transport: {
          type: "stdio",
          command: "test",
          args: [],
        },
        toolNames: ["tool1"],
      };

      const client = await mcpPool.getConnection(
        "instance-id",
        "test-server",
        serverConfig,
      );

      expect(client).toBe(mockClient);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
    });

    test("既存の接続を再利用する", async () => {
      const { mcpPool } = await import("../mcpPool.js");
      const serverConfig: ServerConfig = {
        name: "test-server",
        transport: {
          type: "stdio",
          command: "test",
          args: [],
        },
        toolNames: ["tool1"],
      };

      // 1回目の接続
      const client1 = await mcpPool.getConnection(
        "instance-id",
        "test-server",
        serverConfig,
      );

      // 接続を返却
      mcpPool.releaseConnection("instance-id", "test-server", client1);

      // 2回目の接続（再利用されるはず）
      const client2 = await mcpPool.getConnection(
        "instance-id",
        "test-server",
        serverConfig,
      );

      expect(client2).toBe(client1);
      // connectは1回だけ呼ばれる
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    test("最大接続数に達した場合エラーをスロー", async () => {
      const { mcpPool } = await import("../mcpPool.js");
      const serverConfig: ServerConfig = {
        name: "test-server",
        transport: {
          type: "stdio",
          command: "test",
          args: [],
        },
        toolNames: ["tool1"],
      };

      // 最大5接続まで作成
      const clients: Client[] = [];
      for (let i = 0; i < 5; i++) {
        const client = await mcpPool.getConnection(
          "instance-id",
          "test-server",
          serverConfig,
        );
        clients.push(client);
      }

      // 6個目はエラーになるはず
      await expect(
        mcpPool.getConnection("instance-id", "test-server", serverConfig),
      ).rejects.toThrow("Maximum connections (5) reached");
    });
  });

  describe("releaseConnection", () => {
    test("接続をプールに返却する", async () => {
      const { mcpPool } = await import("../mcpPool.js");
      const serverConfig: ServerConfig = {
        name: "test-server",
        transport: {
          type: "stdio",
          command: "test",
          args: [],
        },
        toolNames: ["tool1"],
      };

      const client = await mcpPool.getConnection(
        "instance-id",
        "test-server",
        serverConfig,
      );

      // 返却前の統計
      const statsBefore = mcpPool.getStats();
      expect(statsBefore.activeConnections).toBe(1);

      // 接続を返却
      mcpPool.releaseConnection("instance-id", "test-server", client);

      // 返却後の統計
      const statsAfter = mcpPool.getStats();
      expect(statsAfter.activeConnections).toBe(0);
      expect(statsAfter.totalConnections).toBe(1);
    });
  });

  describe("cleanup", () => {
    test("全ての接続をクリーンアップする", async () => {
      const { mcpPool } = await import("../mcpPool.js");
      const serverConfig: ServerConfig = {
        name: "test-server",
        transport: {
          type: "stdio",
          command: "test",
          args: [],
        },
        toolNames: ["tool1"],
      };

      // 複数の接続を作成
      await mcpPool.getConnection("instance-id", "test-server", serverConfig);
      await mcpPool.getConnection(
        "instance-id-2",
        "test-server-2",
        serverConfig,
      );

      // クリーンアップ実行
      await mcpPool.cleanup();

      // 全ての接続がクローズされる
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.close).toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalled();

      // 統計がリセットされる
      const stats = mcpPool.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.poolCount).toBe(0);
    });
  });

  describe("getStats", () => {
    test("正しい統計情報を返す", async () => {
      const { mcpPool } = await import("../mcpPool.js");
      const serverConfig: ServerConfig = {
        name: "test-server",
        transport: {
          type: "stdio",
          command: "test",
          args: [],
        },
        toolNames: ["tool1"],
      };

      // 初期状態
      let stats = mcpPool.getStats();
      expect(stats).toStrictEqual({
        poolCount: 0,
        totalConnections: 0,
        activeConnections: 0,
      });

      // 接続を作成
      const client1 = await mcpPool.getConnection(
        "instance-id",
        "test-server",
        serverConfig,
      );

      stats = mcpPool.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
      expect(stats.poolCount).toBe(1);

      // 接続を返却
      mcpPool.releaseConnection("instance-id", "test-server", client1);

      stats = mcpPool.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(0);
    });
  });
});
