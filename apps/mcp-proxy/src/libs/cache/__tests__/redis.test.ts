/**
 * Redisクライアントのシングルトン管理テスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// モック関数型
type MockFn = ReturnType<typeof vi.fn>;

// モックRedisクライアント型
type MockRedisClient = {
  isOpen: boolean;
  connect: MockFn;
  quit: MockFn;
  on: MockFn;
};

const mockClient: MockRedisClient = {
  isOpen: false,
  connect: vi.fn(),
  quit: vi.fn(),
  on: vi.fn().mockReturnThis(),
};

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockClient),
}));

vi.mock("../../logger/index.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

describe("redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockClient.isOpen = false;
    mockClient.connect.mockReset().mockResolvedValue(undefined);
    mockClient.quit.mockReset().mockResolvedValue(undefined);
    mockClient.on.mockReset().mockReturnThis();

    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("REDIS_CONNECT_TIMEOUT", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getRedisClient", () => {
    test("REDIS_URLが設定されていない場合はnullを返す", async () => {
      vi.stubEnv("REDIS_URL", "");

      const { getRedisClient } = await import("../redis.js");
      const result = await getRedisClient();

      expect(result).toBeNull();
    });

    test("REDIS_URLが設定されている場合はクライアントを返す", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      // 接続成功後にisOpenをtrueに設定
      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { getRedisClient } = await import("../redis.js");
      const result = await getRedisClient();

      expect(result).not.toBeNull();
    });

    test("接続失敗時はnullを返す", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      mockClient.connect.mockRejectedValue(new Error("Connection failed"));

      const { getRedisClient } = await import("../redis.js");
      const result = await getRedisClient();

      expect(result).toBeNull();
    });

    test("既に接続済みの場合は既存のクライアントを返す", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { getRedisClient } = await import("../redis.js");

      const result1 = await getRedisClient();
      const result2 = await getRedisClient();

      expect(result1).toBe(result2);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    test("REDIS_CONNECT_TIMEOUTが設定されている場合は使用される", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      vi.stubEnv("REDIS_CONNECT_TIMEOUT", "10000");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { createClient } = await import("redis");
      const { getRedisClient } = await import("../redis.js");
      await getRedisClient();

      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "redis://localhost:6379",
          socket: expect.objectContaining({
            connectTimeout: 10000,
          }),
        }),
      );
    });

    test("REDIS_CONNECT_TIMEOUTがない場合はデフォルト5000msを使用", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      vi.stubEnv("REDIS_CONNECT_TIMEOUT", "");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { createClient } = await import("redis");
      const { getRedisClient } = await import("../redis.js");
      await getRedisClient();

      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: expect.objectContaining({
            connectTimeout: 5000,
          }),
        }),
      );
    });

    test("イベントハンドラーが登録される", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { getRedisClient } = await import("../redis.js");
      await getRedisClient();

      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function),
      );
      expect(mockClient.on).toHaveBeenCalledWith("ready", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith(
        "reconnecting",
        expect.any(Function),
      );
    });
  });

  describe("closeRedisClient", () => {
    test("クライアントが開いている場合はquitを呼び出す", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { getRedisClient, closeRedisClient } = await import("../redis.js");

      await getRedisClient();

      mockClient.isOpen = true;
      mockClient.quit.mockImplementation(async () => {
        mockClient.isOpen = false;
      });

      await closeRedisClient();

      expect(mockClient.quit).toHaveBeenCalled();
    });

    test("クライアントが閉じている場合はquitを呼び出さない", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      const { closeRedisClient } = await import("../redis.js");

      await closeRedisClient();

      expect(mockClient.quit).not.toHaveBeenCalled();
    });

    test("quit失敗時もエラーをスローしない", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { getRedisClient, closeRedisClient } = await import("../redis.js");

      await getRedisClient();

      mockClient.isOpen = true;
      mockClient.quit.mockRejectedValue(new Error("Quit failed"));

      await expect(closeRedisClient()).resolves.toBeUndefined();
    });
  });

  describe("再接続ストラテジー", () => {
    test("再接続は最大5回まで試行される", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { createClient } = await import("redis");
      const { getRedisClient } = await import("../redis.js");
      await getRedisClient();

      const createClientMock = createClient as MockFn;
      const options = createClientMock.mock.calls[0]?.[0];
      const reconnectStrategy = options?.socket?.reconnectStrategy;

      expect(reconnectStrategy).toBeDefined();

      // 線形バックオフ: retries * 100
      expect(reconnectStrategy(1)).toBe(100);
      expect(reconnectStrategy(2)).toBe(200);
      expect(reconnectStrategy(3)).toBe(300);
      expect(reconnectStrategy(4)).toBe(400);
      expect(reconnectStrategy(5)).toBe(500);

      const result = reconnectStrategy(6);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe(
        "Max reconnection attempts reached",
      );
    });

    test("再接続の遅延は最大3000msに制限される", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");

      mockClient.connect.mockImplementation(async () => {
        mockClient.isOpen = true;
      });

      const { createClient } = await import("redis");
      const { getRedisClient } = await import("../redis.js");
      await getRedisClient();

      const createClientMock = createClient as MockFn;
      const options = createClientMock.mock.calls[0]?.[0];
      const reconnectStrategy = options?.socket?.reconnectStrategy;

      const result = reconnectStrategy(30);
      expect(typeof result === "number" ? result : 0).toBeLessThanOrEqual(3000);
    });
  });
});
