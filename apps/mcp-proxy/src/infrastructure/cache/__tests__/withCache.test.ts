import { describe, test, expect, vi } from "vitest";
import { withCache } from "../withCache.js";

type MockRedis = {
  get: ReturnType<typeof vi.fn>;
  setEx: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

const createMockRedis = (overrides: Partial<MockRedis> = {}): MockRedis => ({
  get: vi.fn().mockResolvedValue(null),
  setEx: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
  ...overrides,
});

const createHooks = () => ({
  onHit: vi.fn(),
  onReadError: vi.fn(),
  onWriteError: vi.fn(),
});

describe("withCache", () => {
  test("キャッシュヒット時は fetch を呼ばず deserialize 結果を返す", async () => {
    const redis = createMockRedis({
      get: vi.fn().mockResolvedValue(JSON.stringify({ id: "cached" })),
    });
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue({ id: "db" });

    const result = await withCache<{ id: string }>({
      redis,
      cacheKey: "k1",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => JSON.stringify(v),
      deserialize: (raw) => JSON.parse(raw) as { id: string },
      onHit: hooks.onHit,
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toStrictEqual({ id: "cached" });
    expect(fetch).not.toHaveBeenCalled();
    expect(hooks.onHit).toHaveBeenCalledTimes(1);
  });

  test("キャッシュミス時は fetch して setEx する", async () => {
    const redis = createMockRedis();
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue({ id: "db" });

    const result = await withCache<{ id: string }>({
      redis,
      cacheKey: "k2",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => JSON.stringify(v),
      deserialize: (raw) => JSON.parse(raw) as { id: string },
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toStrictEqual({ id: "db" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(redis.setEx).toHaveBeenCalledWith("k2", 300, '{"id":"db"}');
  });

  test("negative cache enabled で sentinel hit 時は null を返す", async () => {
    const redis = createMockRedis({
      get: vi.fn().mockResolvedValue("null"),
    });
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue("db-value");

    const result = await withCache<string>({
      redis,
      cacheKey: "k3",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => v,
      deserialize: (raw) => raw,
      negativeCache: { enabled: true },
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("negative cache disabled で sentinel hit 時は del 後に fetch する", async () => {
    const redis = createMockRedis({
      get: vi.fn().mockResolvedValue("null"),
    });
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue("db-value");
    const onBypass = vi.fn();

    const result = await withCache<string>({
      redis,
      cacheKey: "k4",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => v,
      deserialize: (raw) => raw,
      negativeCache: {
        enabled: false,
        onBypass,
      },
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toBe("db-value");
    expect(onBypass).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith("k4");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(redis.setEx).toHaveBeenCalledWith("k4", 300, "db-value");
  });

  test("deserialize 失敗時は read error を通知して fetch にフォールバックする", async () => {
    const redis = createMockRedis({
      get: vi.fn().mockResolvedValue("{broken-json"),
    });
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue({ id: "db" });

    const result = await withCache<{ id: string }>({
      redis,
      cacheKey: "k5",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => JSON.stringify(v),
      deserialize: (raw) => JSON.parse(raw) as { id: string },
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toStrictEqual({ id: "db" });
    expect(hooks.onReadError).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("Redis read error 時は fetch にフォールバックする", async () => {
    const redis = createMockRedis({
      get: vi.fn().mockRejectedValue(new Error("redis get failed")),
    });
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue("db-value");

    const result = await withCache<string>({
      redis,
      cacheKey: "k6",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => v,
      deserialize: (raw) => raw,
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toBe("db-value");
    expect(hooks.onReadError).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("Redis write error 時も結果を返す", async () => {
    const redis = createMockRedis({
      setEx: vi.fn().mockRejectedValue(new Error("redis setEx failed")),
    });
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue("db-value");

    const result = await withCache<string>({
      redis,
      cacheKey: "k7",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => v,
      deserialize: (raw) => raw,
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toBe("db-value");
    expect(hooks.onWriteError).toHaveBeenCalledTimes(1);
  });

  test("boolean false は通常値として保存・復元される", async () => {
    const redis = createMockRedis({
      get: vi.fn().mockResolvedValue("false"),
    });
    const hooks = createHooks();
    const fetch = vi.fn().mockResolvedValue(true);

    const result = await withCache<boolean>({
      redis,
      cacheKey: "k8",
      ttlSeconds: 300,
      fetch,
      serialize: (v) => (v ? "true" : "false"),
      deserialize: (raw) => raw === "true",
      negativeCache: { enabled: false },
      onReadError: hooks.onReadError,
      onWriteError: hooks.onWriteError,
    });

    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
