import { Hono } from "hono";
import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";

// モック関数を定義
const mockCloseRedisClient = vi.fn();
const mockDbDisconnect = vi.fn();
const mockLogInfo = vi.fn();
const mockLogError = vi.fn();

// ルートモジュールをモック
vi.mock("../routes/health.js", () => ({
  healthRoute: new Hono(),
}));
vi.mock("../routes/mcp.js", () => ({
  mcpRoute: new Hono(),
}));
vi.mock("../routes/wellKnown.js", () => ({
  wellKnownRoute: new Hono(),
}));
vi.mock("../routes/oauthRoute.js", () => ({
  oauthRoute: new Hono(),
}));

// loggerをモック
vi.mock("../libs/logger/index.js", () => ({
  logInfo: (...args: unknown[]) => mockLogInfo(...args) as unknown,
  logError: (...args: unknown[]) => mockLogError(...args) as unknown,
}));

// Redisをモック
vi.mock("../libs/cache/redis.js", () => ({
  closeRedisClient: (...args: unknown[]) =>
    mockCloseRedisClient(...args) as unknown,
}));

// DBをモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    $disconnect: (...args: unknown[]) => mockDbDisconnect(...args) as unknown,
  },
}));

// corsをモック
vi.mock("hono/cors", () => ({
  cors: () =>
    vi.fn(async (_c: unknown, next: () => Promise<void>) => {
      await next();
    }),
}));

describe("index.ts", () => {
  let processOnSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCloseRedisClient.mockResolvedValue(undefined);
    mockDbDisconnect.mockResolvedValue(undefined);

    // process.onをスパイして、ハンドラーをキャプチャ
    processOnSpy = vi.spyOn(process, "on") as unknown as Mock;
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  test("デフォルトエクスポートにportとfetchが含まれる", async () => {
    const mod = await import("../index.js");

    expect(mod.default).toHaveProperty("port");
    expect(mod.default).toHaveProperty("fetch");
    expect(typeof mod.default.port).toBe("number");
    expect(typeof mod.default.fetch).toBe("function");
  });

  test("起動ログが出力される", async () => {
    await import("../index.js");

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining("Starting Tumiki MCP Proxy on port"),
      expect.objectContaining({
        mode: "stateless (Hono + MCP SDK)",
        devMode: "disabled",
      }),
    );
  });

  test("DEV_MODE=trueの場合、devModeがenabledと表示される", async () => {
    vi.stubEnv("DEV_MODE", "true");
    await import("../index.js");

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining("Starting Tumiki MCP Proxy on port"),
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        devMode: expect.stringContaining("enabled"),
      }),
    );
    vi.unstubAllEnvs();
  });

  test("SIGTERMとSIGINTハンドラーが登録される", async () => {
    await import("../index.js");

    const sigTermCalls = processOnSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === "SIGTERM",
    );
    const sigIntCalls = processOnSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === "SIGINT",
    );

    expect(sigTermCalls.length).toBeGreaterThanOrEqual(1);
    expect(sigIntCalls.length).toBeGreaterThanOrEqual(1);
  });
});

describe("gracefulShutdown", () => {
  let processExitSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    mockCloseRedisClient.mockResolvedValue(undefined);
    mockDbDisconnect.mockResolvedValue(undefined);
    processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never) as unknown as Mock;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  /**
   * シグナルハンドラーを取得するヘルパー
   */
  const getSignalHandler = async (
    signal: "SIGTERM" | "SIGINT",
  ): Promise<() => void> => {
    const processOnSpy = vi.spyOn(process, "on") as unknown as Mock;
    await import("../index.js");

    const call = processOnSpy.mock.calls.find(
      (c: unknown[]) => c[0] === signal,
    );
    if (!call) {
      throw new Error(`Signal handler for ${signal} not found`);
    }
    return call[1] as () => void;
  };

  test("RedisとDBの接続をクローズしprocess.exitを呼ぶ", async () => {
    const handler = await getSignalHandler("SIGTERM");

    handler();

    // gracefulShutdownとPromise.allが解決するのを待つ
    // タイムアウトPromiseも解決させる
    await vi.advanceTimersByTimeAsync(10000);

    expect(mockLogInfo).toHaveBeenCalledWith("SIGTERM received");
    expect(mockLogInfo).toHaveBeenCalledWith("Closing Redis connection");
    expect(mockCloseRedisClient).toHaveBeenCalledTimes(1);
    expect(mockLogInfo).toHaveBeenCalledWith("Closing database connection");
    expect(mockDbDisconnect).toHaveBeenCalledTimes(1);
    expect(mockLogInfo).toHaveBeenCalledWith(
      "Graceful shutdown completed successfully",
    );
    // .then(() => process.exit(0)) が呼ばれる
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  test("シャットダウンタイムアウトのログを記録する", async () => {
    // closeRedisClientを遅延させてタイムアウトを発生させる
    mockCloseRedisClient.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 20000);
        }),
    );

    const handler = await getSignalHandler("SIGTERM");

    handler();

    // タイムアウト（9秒）まで時間を進める
    await vi.advanceTimersByTimeAsync(9000);

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining("Shutdown timeout reached"),
    );

    // 残りの時間も進めてPromise.allを完了させる
    await vi.advanceTimersByTimeAsync(20000);

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  test("シャットダウン中のエラーをログに記録する", async () => {
    mockCloseRedisClient.mockRejectedValue(new Error("Redis close error"));

    const handler = await getSignalHandler("SIGTERM");

    handler();

    // Promiseが解決するまで待機
    await vi.advanceTimersByTimeAsync(10000);

    expect(mockLogError).toHaveBeenCalledWith(
      "Error during graceful shutdown",
      expect.any(Error),
    );
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  test("SIGINTハンドラーも正常に動作する", async () => {
    const handler = await getSignalHandler("SIGINT");

    handler();

    await vi.advanceTimersByTimeAsync(10000);

    expect(mockLogInfo).toHaveBeenCalledWith("SIGINT received");
    expect(mockCloseRedisClient).toHaveBeenCalledTimes(1);
    expect(mockDbDisconnect).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});
