/**
 * @fileoverview キャッシュシステムのインデックステスト
 */

import { describe, test, expect } from "vitest";
import {
  createLRUCache,
  createToolsCache,
  createAuthCache,
  createSessionCache,
  createDataCache,
  type CacheStats,
  type CacheInstance,
} from "../../../utils/cache/index.js";

describe("cache index exports", () => {
  test("コア機能のエクスポート", () => {
    expect(typeof createLRUCache).toBe("function");
  });

  test("ドメイン固有ファクトリーのエクスポート", () => {
    expect(typeof createToolsCache).toBe("function");
    expect(typeof createAuthCache).toBe("function");
    expect(typeof createSessionCache).toBe("function");
    expect(typeof createDataCache).toBe("function");
  });

  test("基本的なキャッシュ作成", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
      ttl: 1000,
    });

    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe("function");
    expect(typeof cache.set).toBe("function");
    expect(typeof cache.delete).toBe("function");
    expect(typeof cache.clear).toBe("function");
  });

  test("ツールキャッシュ作成", () => {
    const toolsCache = createToolsCache();

    expect(toolsCache).toBeDefined();
    expect(typeof toolsCache.setTools).toBe("function");
    expect(typeof toolsCache.getTools).toBe("function");
    expect(typeof toolsCache.generateKey).toBe("function");
  });

  test("型定義の利用可能性", () => {
    // TypeScript型チェックのため、実際の値の検証は不要
    // コンパイル時に型が正しくエクスポートされているかを確認

    const cache: CacheInstance<{ value: string }> = createLRUCache({
      max: 10,
      ttl: 1000,
    });

    const stats: CacheStats = cache.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.hitCount).toBe("number");
    expect(typeof stats.missCount).toBe("number");
    expect(typeof stats.entryCount).toBe("number");
    expect(typeof stats.hitRate).toBe("number");
  });
});
