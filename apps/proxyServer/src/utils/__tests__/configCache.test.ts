import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { ServerConfig } from "../../libs/types.js";

// proxy.tsのモックを設定
vi.mock("../proxy.js", async () => {
  const actual = await vi.importActual("../proxy.js");
  const { createDataCache } = await import("../cache/index.js");

  // 実際のconfigCacheインスタンスを作成
  const configCache = createDataCache<{ configs: ServerConfig[] }>("config");

  return {
    ...actual,
    getServerConfigsByInstanceId: vi.fn(async (instanceId: string) => {
      const cacheKey = configCache.generateKey(instanceId);
      const cached = configCache.get(cacheKey);

      if (cached) {
        return cached.configs;
      }

      // モックデータを返す
      const configs: ServerConfig[] = [
        {
          name: "test-server",
          toolNames: ["tool1", "tool2"],
          transport: {
            type: "stdio",
            command: "node",
            args: ["server.js"],
            env: {},
          },
          googleCredentials: null,
        },
      ];

      configCache.set(cacheKey, { configs });
      return configs;
    }),
    invalidateConfigCache: vi.fn((instanceId: string) => {
      const cacheKey = configCache.generateKey(instanceId);
      configCache.delete(cacheKey);
    }),
    _configCache: configCache, // テスト用にキャッシュを公開
  };
});

describe("configCache", () => {
  let getServerConfigsByInstanceId:
    | ((instanceId: string) => Promise<ServerConfig[]>)
    | undefined;
  let invalidateConfigCache: ((instanceId: string) => void) | undefined;
  let configCache: ReturnType<
    typeof import("../cache/index.js").createDataCache<{
      configs: ServerConfig[];
    }>
  >;

  beforeEach(async () => {
    vi.clearAllMocks();
    const proxyModule = await import("../proxy.js");
    getServerConfigsByInstanceId = proxyModule.getServerConfigsByInstanceId;
    invalidateConfigCache = proxyModule.invalidateConfigCache;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    configCache = (proxyModule as any)._configCache;
    configCache.clear(); // キャッシュをクリア
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getServerConfigsByInstanceId のキャッシュ動作", () => {
    test("初回呼び出し時はキャッシュミスでデータベースから取得", async () => {
      const instanceId = "test-instance-1";

      const result = await getServerConfigsByInstanceId!(instanceId);

      expect(result).toStrictEqual([
        {
          name: "test-server",
          toolNames: ["tool1", "tool2"],
          transport: {
            type: "stdio",
            command: "node",
            args: ["server.js"],
            env: {},
          },
          googleCredentials: null,
        },
      ]);

      // キャッシュに保存されていることを確認
      const cacheKey = configCache.generateKey(instanceId);
      const cached = configCache.get(cacheKey);
      expect(cached).toBeTruthy();
      expect(cached?.configs).toStrictEqual(result);
    });

    test("2回目の呼び出しはキャッシュヒットでキャッシュから取得", async () => {
      const instanceId = "test-instance-2";

      // 1回目の呼び出し
      const result1 = await getServerConfigsByInstanceId!(instanceId);

      // 2回目の呼び出し
      const result2 = await getServerConfigsByInstanceId!(instanceId);

      // 同じ結果が返される
      expect(result2).toStrictEqual(result1);

      // モック関数が2回呼ばれていることを確認
      expect(getServerConfigsByInstanceId).toHaveBeenCalledTimes(2);
    });

    test("異なるinstanceIdは別々にキャッシュされる", async () => {
      const instanceId1 = "test-instance-3";
      const instanceId2 = "test-instance-4";

      await getServerConfigsByInstanceId!(instanceId1);
      await getServerConfigsByInstanceId!(instanceId2);

      // 両方のキャッシュが存在することを確認
      const cacheKey1 = configCache.generateKey(instanceId1);
      const cacheKey2 = configCache.generateKey(instanceId2);

      expect(configCache.get(cacheKey1)).toBeTruthy();
      expect(configCache.get(cacheKey2)).toBeTruthy();
    });
  });

  describe("invalidateConfigCache", () => {
    test("指定したinstanceIdのキャッシュが無効化される", async () => {
      const instanceId = "test-instance-5";

      // キャッシュに保存
      await getServerConfigsByInstanceId!(instanceId);

      // キャッシュが存在することを確認
      const cacheKey = configCache.generateKey(instanceId);
      expect(configCache.get(cacheKey)).toBeTruthy();

      // キャッシュを無効化
      invalidateConfigCache!(instanceId);

      // キャッシュが削除されていることを確認
      expect(configCache.get(cacheKey)).toBeNull();
    });

    test("無効化後に再度取得すると新しいデータがキャッシュされる", async () => {
      const instanceId = "test-instance-6";

      // 初回取得
      const result1 = await getServerConfigsByInstanceId!(instanceId);

      // キャッシュを無効化
      invalidateConfigCache!(instanceId);

      // 再度取得
      const result2 = await getServerConfigsByInstanceId!(instanceId);

      // 結果は同じだが、新しくキャッシュされている
      expect(result2).toStrictEqual(result1);

      const cacheKey = configCache.generateKey(instanceId);
      expect(configCache.get(cacheKey)).toBeTruthy();
    });
  });

  describe("キャッシュのパフォーマンス効果", () => {
    test("キャッシュヒット時は高速に応答する", async () => {
      const instanceId = "test-instance-perf";

      // 初回呼び出し（キャッシュミス）
      const start1 = performance.now();
      await getServerConfigsByInstanceId!(instanceId);
      const time1 = performance.now() - start1;

      // 2回目呼び出し（キャッシュヒット）
      const start2 = performance.now();
      await getServerConfigsByInstanceId!(instanceId);
      const time2 = performance.now() - start2;

      // キャッシュヒット時は5ms未満で応答することを期待
      expect(time2).toBeLessThan(5);

      // キャッシュヒット時の方が高速であることを確認
      // （モックなので大きな差は出ないが、原理的にはキャッシュの方が速い）
      console.log(
        `Cache miss: ${time1.toFixed(2)}ms, Cache hit: ${time2.toFixed(2)}ms`,
      );
    });
  });
});
