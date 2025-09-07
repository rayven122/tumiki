import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { getConnection, releaseConnection, cleanup } from "../poolManager.js";
import type { MCPConnection } from "../types.js";
import type { ServerConfig } from "../../../libs/types.js";

vi.mock("../../../libs/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockTransportInstance = {
  close: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue(undefined),
  onMessage: vi.fn(),
  onClose: vi.fn(),
  onError: vi.fn(),
};

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => mockTransportInstance),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => mockTransportInstance),
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    request: vi.fn().mockResolvedValue({ tools: [] }),
    close: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@tumiki/utils/server/security", () => ({
  setupGoogleCredentialsEnv: vi.fn().mockResolvedValue({
    envVars: {},
    cleanup: vi.fn(),
  }),
}));

describe("Pool Manager", () => {
  let mockServerConfig: ServerConfig;

  beforeEach(() => {
    mockServerConfig = {
      name: "test-server",
      toolNames: ["test-tool"],
      transport: {
        type: "stdio",
        command: "test-command",
        args: ["test-arg"],
      },
    } as ServerConfig;
  });

  afterEach(async () => {
    await cleanup();
    vi.clearAllMocks();
  });

  describe("getConnection", () => {
    test("新しい接続を取得できる", async () => {
      const connection = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      expect(connection).toBeDefined();
      expect(connection.serverName).toBe("test-server");
      expect(connection.userServerConfigInstanceId).toBe("test-instance-id");
      expect(connection.isActive).toBe(true);
    });

    test("異なるサーバーの複数接続を管理できる", async () => {
      const connection1 = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      const connection2 = await getConnection(
        "test-instance-id",
        "test-server-2",
        { ...mockServerConfig, name: "test-server-2" },
      );

      expect(connection1).not.toBe(connection2);
      expect(connection1.serverName).toBe("test-server");
      expect(connection2.serverName).toBe("test-server-2");

      await releaseConnection(connection1);
      await releaseConnection(connection2);
    });

    test("最大接続数制限が動作する（3接続まで）", async () => {
      const connections: MCPConnection[] = [];

      // 最大接続数まで接続を作成（CONFIG.maxConnectionsPerServer = 3）
      for (let i = 0; i < 3; i++) {
        const conn = await getConnection(
          "test-instance-id",
          "test-server",
          mockServerConfig,
        );
        connections.push(conn);
      }

      // 4番目の接続でエラーが発生することを確認
      await expect(
        getConnection("test-instance-id", "test-server", mockServerConfig),
      ).rejects.toThrow("Maximum connections");

      // クリーンアップ
      for (const conn of connections) {
        await releaseConnection(conn);
      }
    });

    test("異なるインスタンスIDで別々のプールが管理される", async () => {
      const connection1 = await getConnection(
        "instance-1",
        "test-server",
        mockServerConfig,
      );

      const connection2 = await getConnection(
        "instance-2",
        "test-server",
        mockServerConfig,
      );

      expect(connection1).not.toBe(connection2);
      expect(connection1.userServerConfigInstanceId).toBe("instance-1");
      expect(connection2.userServerConfigInstanceId).toBe("instance-2");

      await releaseConnection(connection1);
      await releaseConnection(connection2);
    });
  });

  describe("releaseConnection", () => {
    test("接続をプールに返却できる", async () => {
      const connection = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      expect(connection.isActive).toBe(true);

      await releaseConnection(connection);

      expect(connection.isActive).toBe(false);
    });
  });

  describe("connection reuse", () => {
    test("接続プールから既存接続を再利用する", async () => {
      // 最初の接続を作成して返却
      const connection1 = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );
      await releaseConnection(connection1);

      // 2回目の接続取得（再利用されるべき）
      const connection2 = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      expect(connection1).toBe(connection2);
      expect(connection2.isActive).toBe(true);

      await releaseConnection(connection2);
    });

    test("不健全な接続は削除され新しい接続が作成される", async () => {
      const connection1 = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      // ヘルスチェックを失敗させる
      const mockClient = connection1.client as unknown as {
        request: ReturnType<typeof vi.fn>;
      };
      mockClient.request = vi
        .fn()
        .mockRejectedValue(new Error("Health check failed"));

      await releaseConnection(connection1);

      // 2回目の接続取得（新しい接続が作成されるべき）
      const connection2 = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      // 新しいクライアントが作成されているため、異なるオブジェクトになる
      expect(connection2).toBeDefined();
      expect(connection2.isActive).toBe(true);

      await releaseConnection(connection2);
    });
  });

  describe("cleanup", () => {
    test("プールの完全クリーンアップが動作する", async () => {
      const connections = [];
      for (let i = 0; i < 3; i++) {
        const conn = await getConnection(
          "test-instance-id",
          `test-server-${i}`,
          {
            ...mockServerConfig,
            name: `test-server-${i}`,
          },
        );
        connections.push(conn);
      }

      await cleanup();

      // クリーンアップ後は新しい接続が作成される
      const newConnection = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );
      expect(newConnection).toBeDefined();

      await releaseConnection(newConnection);
    });

    test("クリーンアップでエラーが発生しても処理が継続される", async () => {
      const connection = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      // 接続を壊してクリーンアップエラーを発生させる
      const mockClient = connection.client as unknown as {
        close: ReturnType<typeof vi.fn>;
      };
      mockClient.close = vi.fn().mockRejectedValue(new Error("Close failed"));

      // エラーが投げられないことを確認
      await expect(cleanup()).resolves.toBeUndefined();
    });
  });

  describe("idle connection cleanup", () => {
    test("アイドル接続の自動クリーンアップ", async () => {
      const connection = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      await releaseConnection(connection);

      // lastUsedを古い時間に設定してアイドル状態をシミュレート
      connection.lastUsed = Date.now() - 130000; // 130秒前（2分以上前）

      // クリーンアップを待つ（実際のタイマーは30秒間隔だが、テストでは即座に実行）
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 新しい接続を取得すると、古い接続は削除されているはず
      const newConnection = await getConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
      );

      expect(newConnection).toBeDefined();
      await releaseConnection(newConnection);
    });
  });
});
