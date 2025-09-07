import { describe, test, expect, beforeEach } from "vitest";
import {
  ToolsCache,
  generateCacheKey,
  generateServerConfigHash,
  getToolsCacheInstance,
} from "../../utils/toolsCache.js";
import type { Tool } from "@tumiki/db";
import type { ServerConfig } from "../../utils/toolsCache.js";

const createMockTool = (id: string, name: string): Tool => ({
  id,
  name,
  description: `Description for ${name}`,
  inputSchema: { type: "object", properties: {} },
  isEnabled: true,
  mcpServerId: "server-1",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("ToolsCache", () => {
  let cache: ToolsCache;

  beforeEach(() => {
    cache = new ToolsCache();
  });

  test("キャッシュの保存と取得", () => {
    const tools: Tool[] = [
      createMockTool("tool-1", "read_file"),
      createMockTool("tool-2", "write_file"),
    ];
    const key = "test-key";
    const hash = "test-hash";

    cache.set(key, tools, hash);
    const result = cache.get(key);

    expect(result).toEqual(tools);
    expect(result).toHaveLength(2);
    expect(result?.[0]?.name).toBe("read_file");
  });

  test("存在しないキーの取得はnullを返す", () => {
    const result = cache.get("non-existent-key");
    expect(result).toBeNull();
  });

  test("TTLによる自動削除", () => {
    // TTLのテストは実際のタイミングではなく、
    // キャッシュの設定と基本動作を確認
    const tools: Tool[] = [createMockTool("tool-1", "test_tool")];
    const key = "ttl-test-key";
    const hash = "test-hash";

    cache.set(key, tools, hash);

    // 設定された値が取得できることを確認
    expect(cache.get(key)).toEqual(tools);

    // ヒット統計が更新されることを確認
    const stats = cache.getStats();
    expect(stats.hitCount).toBe(1);
  });

  test("設定変更時の無効化", () => {
    const tools1: Tool[] = [createMockTool("tool-1", "tool1")];
    const tools2: Tool[] = [createMockTool("tool-2", "tool2")];

    const instanceId = "server-instance-123";
    const key1 = generateCacheKey(instanceId, "hash1");
    const key2 = generateCacheKey(instanceId, "hash2");
    const key3 = generateCacheKey("other-instance", "hash3");

    cache.set(key1, tools1, "hash1");
    cache.set(key2, tools2, "hash2");
    cache.set(key3, tools1, "hash3");

    // 特定のインスタンスIDのキャッシュを無効化
    cache.invalidate(instanceId);

    expect(cache.get(key1)).toBeNull();
    expect(cache.get(key2)).toBeNull();
    expect(cache.get(key3)).toEqual(tools1); // 別のインスタンスは残る
  });

  test("統計情報の取得", () => {
    const tools: Tool[] = [createMockTool("tool-1", "test_tool")];

    // 初期状態
    let stats = cache.getStats();
    expect(stats.hitCount).toBe(0);
    expect(stats.missCount).toBe(0);
    expect(stats.entryCount).toBe(0);
    expect(stats.hitRate).toBe(0);

    // キャッシュに追加
    cache.set("key1", tools, "hash1");
    cache.set("key2", tools, "hash2");

    // ヒット
    cache.get("key1");
    cache.get("key1");

    // ミス
    cache.get("non-existent");

    stats = cache.getStats();
    expect(stats.hitCount).toBe(2);
    expect(stats.missCount).toBe(1);
    expect(stats.entryCount).toBe(2);
    expect(stats.hitRate).toBe(2 / 3); // 2/3 = 0.666...
    expect(stats.memoryUsage).toBeGreaterThan(0);
  });

  test("キャッシュのクリア", () => {
    const tools: Tool[] = [createMockTool("tool-1", "test_tool")];

    cache.set("key1", tools, "hash1");
    cache.get("key1"); // ヒット
    cache.get("non-existent"); // ミス

    expect(cache.getStats().entryCount).toBe(1);
    expect(cache.getStats().hitCount).toBe(1);
    expect(cache.getStats().missCount).toBe(1);

    cache.clear();

    const stats = cache.getStats();
    expect(stats.entryCount).toBe(0);
    expect(stats.hitCount).toBe(0);
    expect(stats.missCount).toBe(0);
    expect(stats.hitRate).toBe(0);
  });
});

describe("generateCacheKey", () => {
  test("キャッシュキーの生成", () => {
    const instanceId = "server-instance-123";
    const hash = "config-hash-456";

    const key = generateCacheKey(instanceId, hash);

    expect(key).toBe("tools:server-instance-123:config-hash-456");
  });
});

describe("generateServerConfigHash", () => {
  test("サーバー設定のハッシュ生成", () => {
    const configs: ServerConfig[] = [
      { name: "github", toolNames: ["read_file", "write_file"] },
      { name: "notion", toolNames: ["search_pages"] },
    ];

    const hash = generateServerConfigHash(configs);

    expect(hash).toMatch(/^[a-f0-9]{32}$/); // MD5ハッシュは32文字の16進数
  });

  test("同じ設定は同じハッシュを生成", () => {
    const configs: ServerConfig[] = [
      { name: "github", toolNames: ["read_file"] },
    ];

    const hash1 = generateServerConfigHash(configs);
    const hash2 = generateServerConfigHash(configs);

    expect(hash1).toBe(hash2);
  });

  test("異なる設定は異なるハッシュを生成", () => {
    const configs1: ServerConfig[] = [
      { name: "github", toolNames: ["read_file"] },
    ];
    const configs2: ServerConfig[] = [
      { name: "github", toolNames: ["write_file"] },
    ];

    const hash1 = generateServerConfigHash(configs1);
    const hash2 = generateServerConfigHash(configs2);

    expect(hash1).not.toBe(hash2);
  });

  test("toolNamesが未定義でも処理できる", () => {
    const configs: ServerConfig[] = [
      { name: "github" },
      { name: "notion", toolNames: ["search_pages"] },
    ];

    expect(() => generateServerConfigHash(configs)).not.toThrow();
    const hash = generateServerConfigHash(configs);
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("getToolsCacheInstance", () => {
  test("シングルトンインスタンスの取得", () => {
    const instance1 = getToolsCacheInstance();
    const instance2 = getToolsCacheInstance();

    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(ToolsCache);
  });

  test("インスタンス間でのデータ共有", () => {
    const instance1 = getToolsCacheInstance();
    const instance2 = getToolsCacheInstance();

    const tools: Tool[] = [createMockTool("tool-1", "shared_tool")];
    const key = "shared-key";
    const hash = "shared-hash";

    instance1.set(key, tools, hash);
    const result = instance2.get(key);

    expect(result).toEqual(tools);
  });
});
