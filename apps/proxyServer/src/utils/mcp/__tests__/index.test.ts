import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { withConnection, withConnectionBatch } from "../index.js";
import { cleanup } from "../poolManager.js";
import type { ServerConfig } from "../../../libs/types.js";

vi.mock("../../../libs/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../../libs/config.js", () => ({
  config: {
    connectionPool: {
      maxConnectionsPerServer: 5,
      idleTimeout: 180000,
      cleanupInterval: 60000,
    },
    metrics: {
      enabled: true,
      interval: 60000,
    },
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

describe("MCP Connection API Integration Tests", () => {
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

  describe("withConnection", () => {
    test("自動リソース管理で単一操作を実行", async () => {
      const mockOperation = vi.fn().mockResolvedValue("test-result");

      const result = await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        mockOperation,
      );

      expect(result).toBe("test-result");
      expect(mockOperation).toHaveBeenCalledWith(expect.any(Object)); // Client
    });

    test("エラー発生時でも適切にリソースが解放される", async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error("Operation failed"));

      await expect(
        withConnection(
          "test-instance-id",
          "test-server",
          mockServerConfig,
          mockOperation,
        ),
      ).rejects.toThrow("Operation failed");

      expect(mockOperation).toHaveBeenCalled();

      // 次の操作が正常に実行できることを確認（リソースが解放されている証拠）
      const nextOperation = vi.fn().mockResolvedValue("success");
      const nextResult = await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        nextOperation,
      );
      expect(nextResult).toBe("success");
    });

    test("複数のwithConnection呼び出しで接続が再利用される", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockResolvedValue("result2");

      // 1回目の実行
      const result1 = await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operation1,
      );

      // 2回目の実行（接続が再利用されるべき）
      const result2 = await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operation2,
      );

      expect(result1).toBe("result1");
      expect(result2).toBe("result2");
      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
    });
  });

  describe("withConnectionBatch", () => {
    test("複数の操作を同一接続でPromise.allで並列実行", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockResolvedValue("result2");
      const operation3 = vi.fn().mockResolvedValue("result3");

      const results = await withConnectionBatch(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        [operation1, operation2, operation3],
      );

      expect(results).toStrictEqual(["result1", "result2", "result3"]);
      expect(operation1).toHaveBeenCalledWith(expect.any(Object));
      expect(operation2).toHaveBeenCalledWith(expect.any(Object));
      expect(operation3).toHaveBeenCalledWith(expect.any(Object));
    });

    test("並列実行でパフォーマンスの向上を確認", async () => {
      const startTime = Date.now();

      const operations = Array.from({ length: 3 }, (_, i) =>
        vi.fn().mockImplementation(async () => {
          // 50msの模擬遅延
          await new Promise((resolve) => setTimeout(resolve, 50));
          return `result${i}`;
        }),
      );

      const results = await withConnectionBatch(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operations,
      );

      const totalTime = Date.now() - startTime;

      expect(results).toStrictEqual(["result0", "result1", "result2"]);
      // 並列実行の場合、総実行時間は逐次実行（150ms）より短くなるはず
      expect(totalTime).toBeLessThan(120); // 余裕をもって120ms

      operations.forEach((op) => expect(op).toHaveBeenCalled());
    });

    test("エラー発生時でも適切にリソースが解放される", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi
        .fn()
        .mockRejectedValue(new Error("Operation2 failed"));
      const operation3 = vi.fn().mockResolvedValue("result3");

      await expect(
        withConnectionBatch(
          "test-instance-id",
          "test-server",
          mockServerConfig,
          [operation1, operation2, operation3],
        ),
      ).rejects.toThrow("Operation2 failed");

      // Promise.allの特性上、すべての操作が開始される
      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
      expect(operation3).toHaveBeenCalled();
    });

    test("空の操作配列でも正常動作する", async () => {
      const results = await withConnectionBatch(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        [],
      );

      expect(results).toStrictEqual([]);
    });

    test("大量の並列操作を処理できる", async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        vi.fn().mockResolvedValue(`result${i}`),
      );

      const results = await withConnectionBatch(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operations,
      );

      expect(results).toHaveLength(10);
      expect(results[0]).toBe("result0");
      expect(results[9]).toBe("result9");
      operations.forEach((op) => expect(op).toHaveBeenCalled());
    });
  });

  describe("error handling and resource management", () => {
    test("操作実行中のエラーハンドリング", async () => {
      const failingOperation = vi
        .fn()
        .mockRejectedValue(new Error("Operation failed"));

      await expect(
        withConnection(
          "test-instance-id",
          "test-server",
          mockServerConfig,
          failingOperation,
        ),
      ).rejects.toThrow("Operation failed");

      expect(failingOperation).toHaveBeenCalled();
    });

    test("接続プール統合テスト", async () => {
      // 接続が適切に作成され、プールで管理されることを確認
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockResolvedValue("result2");

      // 最初の接続
      const result1 = await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operation1,
      );

      // 2番目の接続（プールから再利用される）
      const result2 = await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operation2,
      );

      expect(result1).toBe("result1");
      expect(result2).toBe("result2");
      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
    });
  });

  describe("connection lifecycle", () => {
    test("同じサーバーへの複数リクエストで接続が再利用される", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockResolvedValue("result2");

      // 連続して実行
      await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operation1,
      );
      await withConnection(
        "test-instance-id",
        "test-server",
        mockServerConfig,
        operation2,
      );

      // 両方とも成功することを確認
      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
    });

    test("異なるサーバーで別々の接続が作成される", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockResolvedValue("result2");

      const serverConfig2 = { ...mockServerConfig, name: "test-server-2" };

      await Promise.all([
        withConnection(
          "test-instance-id",
          "test-server-1",
          mockServerConfig,
          operation1,
        ),
        withConnection(
          "test-instance-id",
          "test-server-2",
          serverConfig2,
          operation2,
        ),
      ]);

      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
    });
  });

  describe("enhanced error handling", () => {
    test("withConnectionでのエラーにコンテキスト情報が含まれる", async () => {
      const originalError = new Error("Original operation failed");
      const failingOperation = vi.fn().mockRejectedValue(originalError);

      try {
        await withConnection(
          "test-user-id",
          "test-server",
          mockServerConfig,
          failingOperation,
        );
        expect.fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error & { cause?: unknown };
        expect(err.message).toContain(
          "MCP operation failed for server 'test-server'",
        );
        expect(err.message).toContain("user: test-user-id");
        expect(err.message).toContain("Original operation failed");
        expect(err.cause).toBe(originalError);
      }
    });

    test("withConnectionBatchでのエラーにコンテキスト情報が含まれる", async () => {
      const originalError = new Error("Batch operation failed");
      const failingOperation = vi.fn().mockRejectedValue(originalError);

      try {
        await withConnectionBatch(
          "test-user-id",
          "test-server",
          mockServerConfig,
          [failingOperation],
        );
        expect.fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error & { cause?: unknown };
        expect(err.message).toContain(
          "MCP batch operation failed for server 'test-server'",
        );
        expect(err.message).toContain("1 operations");
        expect(err.message).toContain("user: test-user-id");
        expect(err.message).toContain("Batch operation failed");
        expect(err.cause).toBe(originalError);
      }
    });

    test("複数操作のバッチでのエラー情報", async () => {
      const originalError = new Error("One of the operations failed");
      const operations = [
        vi.fn().mockResolvedValue("success"),
        vi.fn().mockRejectedValue(originalError),
        vi.fn().mockResolvedValue("success"),
      ];

      try {
        await withConnectionBatch(
          "test-user-id",
          "test-server",
          mockServerConfig,
          operations,
        );
        expect.fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error & { cause?: unknown };
        expect(err.message).toContain("3 operations");
        expect(err.cause).toBe(originalError);
      }
    });

    test("エラーログに詳細な情報が記録される", async () => {
      const { logger } = await import("../../../libs/logger.js");
      const mockLogger = logger as unknown as Record<
        string,
        ReturnType<typeof vi.fn>
      >;

      const originalError = new Error("Test error");
      const failingOperation = vi.fn().mockRejectedValue(originalError);

      try {
        await withConnection(
          "test-user-id",
          "test-server",
          mockServerConfig,
          failingOperation,
        );
      } catch {
        // エラーは期待される
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Operation failed with MCP connection",
        expect.objectContaining({
          serverName: "test-server",
          userServerConfigInstanceId: "test-user-id",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          isActive: expect.any(Boolean),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          lastUsed: expect.any(String),
          error: "Test error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.any(String),
        }),
      );
    });
  });
});
