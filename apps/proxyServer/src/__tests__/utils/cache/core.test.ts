/**
 * @fileoverview 基本LRUキャッシュのテストスイート
 */

import { describe, test, expect } from "vitest";
import { createLRUCache } from "../../../utils/cache/core.js";

describe("createLRUCache", () => {
  test("基本的なget/set操作", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
      ttl: 1000,
    });

    cache.set("key1", { value: "value1" });
    expect(cache.get("key1")).toStrictEqual({ value: "value1" });
    expect(cache.get("nonexistent")).toBeNull();
  });

  test("delete操作", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
    });

    cache.set("key1", { value: "value1" });
    expect(cache.get("key1")).toStrictEqual({ value: "value1" });

    const deleted = cache.delete("key1");
    expect(deleted).toBe(true);
    expect(cache.get("key1")).toBeNull();

    const notDeleted = cache.delete("nonexistent");
    expect(notDeleted).toBe(false);
  });

  test("clear操作", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
    });

    cache.set("key1", { value: "value1" });
    cache.set("key2", { value: "value2" });
    expect(cache.getStats().entryCount).toBe(2);

    cache.clear();
    expect(cache.getStats().entryCount).toBe(0);
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
  });

  test("max制限", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 2,
    });

    cache.set("key1", { value: "value1" });
    cache.set("key2", { value: "value2" });
    cache.set("key3", { value: "value3" }); // key1が削除される

    expect(cache.getStats().entryCount).toBe(2);
    expect(cache.get("key1")).toBeNull(); // LRUで削除
    expect(cache.get("key2")).toStrictEqual({ value: "value2" });
    expect(cache.get("key3")).toStrictEqual({ value: "value3" });
  });

  test("TTL有効期限", async () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
      ttl: 50, // 50ms
    });

    cache.set("key1", { value: "value1" });
    expect(cache.get("key1")).toStrictEqual({ value: "value1" });

    // TTL経過後は取得できない
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cache.get("key1")).toBeNull();
  });

  test("prefixによる無効化", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
    });

    cache.set("user:123:profile", { value: "profile1" });
    cache.set("user:123:settings", { value: "settings1" });
    cache.set("user:456:profile", { value: "profile2" });
    cache.set("other:data", { value: "data1" });

    expect(cache.getStats().entryCount).toBe(4);

    cache.invalidatePrefix("user:123:");

    expect(cache.getStats().entryCount).toBe(2);
    expect(cache.get("user:123:profile")).toBeNull();
    expect(cache.get("user:123:settings")).toBeNull();
    expect(cache.get("user:456:profile")).toStrictEqual({ value: "profile2" });
    expect(cache.get("other:data")).toStrictEqual({ value: "data1" });
  });

  test("統計情報の取得", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
    });

    // 初期状態
    let stats = cache.getStats();
    expect(stats.hitCount).toBe(0);
    expect(stats.missCount).toBe(0);
    expect(stats.entryCount).toBe(0);
    expect(stats.hitRate).toBe(0);

    // データを追加してアクセス
    cache.set("key1", { value: "value1" });
    cache.get("key1"); // hit
    cache.get("key2"); // miss

    stats = cache.getStats();
    expect(stats.hitCount).toBe(1);
    expect(stats.missCount).toBe(1);
    expect(stats.entryCount).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  test("clearで統計もリセット", () => {
    const cache = createLRUCache<{ value: string }>({
      max: 10,
    });

    cache.set("key1", { value: "value1" });
    cache.get("key1"); // hit
    cache.get("key2"); // miss

    let stats = cache.getStats();
    expect(stats.hitCount).toBe(1);
    expect(stats.missCount).toBe(1);

    cache.clear();

    stats = cache.getStats();
    expect(stats.hitCount).toBe(0);
    expect(stats.missCount).toBe(0);
    expect(stats.entryCount).toBe(0);
    expect(stats.hitRate).toBe(0);
  });
});
