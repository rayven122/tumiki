import { describe, test, expect, beforeEach } from "vitest";
import { SessionCache } from "../sessionCache.js";

describe("SessionCache", () => {
  let cache: SessionCache;

  beforeEach(() => {
    cache = new SessionCache();
  });

  describe("add", () => {
    test("セッションを追加できる", () => {
      cache.add("session1", "instance1");

      expect(cache.getSessionIds("instance1")).toStrictEqual(["session1"]);
      expect(cache.getInstanceId("session1")).toBe("instance1");
    });

    test("同じインスタンスに複数のセッションを追加できる", () => {
      cache.add("session1", "instance1");
      cache.add("session2", "instance1");
      cache.add("session3", "instance1");

      const sessionIds = cache.getSessionIds("instance1");
      expect(sessionIds).toHaveLength(3);
      expect(sessionIds).toContain("session1");
      expect(sessionIds).toContain("session2");
      expect(sessionIds).toContain("session3");
    });

    test("異なるインスタンスにセッションを追加できる", () => {
      cache.add("session1", "instance1");
      cache.add("session2", "instance2");

      expect(cache.getSessionIds("instance1")).toStrictEqual(["session1"]);
      expect(cache.getSessionIds("instance2")).toStrictEqual(["session2"]);
    });

    test("同じセッションIDで異なるインスタンスに追加すると上書きされる", () => {
      cache.add("session1", "instance1");
      cache.add("session1", "instance2");

      expect(cache.getSessionIds("instance1")).toStrictEqual([]);
      expect(cache.getSessionIds("instance2")).toStrictEqual(["session1"]);
      expect(cache.getInstanceId("session1")).toBe("instance2");
    });
  });

  describe("remove", () => {
    test("セッションを削除できる", () => {
      cache.add("session1", "instance1");
      cache.remove("session1");

      expect(cache.getSessionIds("instance1")).toStrictEqual([]);
      expect(cache.getInstanceId("session1")).toBeUndefined();
    });

    test("存在しないセッションを削除してもエラーにならない", () => {
      expect(() => cache.remove("nonexistent")).not.toThrow();
    });

    test("複数セッションから特定のセッションのみ削除できる", () => {
      cache.add("session1", "instance1");
      cache.add("session2", "instance1");
      cache.add("session3", "instance1");

      cache.remove("session2");

      const sessionIds = cache.getSessionIds("instance1");
      expect(sessionIds).toHaveLength(2);
      expect(sessionIds).toContain("session1");
      expect(sessionIds).toContain("session3");
      expect(sessionIds).not.toContain("session2");
    });

    test("最後のセッションを削除すると空のSetも削除される", () => {
      cache.add("session1", "instance1");
      cache.remove("session1");

      const stats = cache.getStats();
      expect(stats.instanceCount).toBe(0);
    });
  });

  describe("getSessionIds", () => {
    test("存在しないインスタンスの場合は空配列を返す", () => {
      expect(cache.getSessionIds("nonexistent")).toStrictEqual([]);
    });

    test("複数のセッションIDを取得できる", () => {
      cache.add("session1", "instance1");
      cache.add("session2", "instance1");

      const sessionIds = cache.getSessionIds("instance1");
      expect(sessionIds).toHaveLength(2);
      expect(sessionIds).toContain("session1");
      expect(sessionIds).toContain("session2");
    });
  });

  describe("hasActiveSession", () => {
    test("アクティブなセッションがある場合はtrueを返す", () => {
      cache.add("session1", "instance1");
      expect(cache.hasActiveSession("instance1")).toBe(true);
    });

    test("アクティブなセッションがない場合はfalseを返す", () => {
      expect(cache.hasActiveSession("instance1")).toBe(false);
    });

    test("セッションを削除後はfalseを返す", () => {
      cache.add("session1", "instance1");
      cache.remove("session1");
      expect(cache.hasActiveSession("instance1")).toBe(false);
    });
  });

  describe("getInstanceId", () => {
    test("セッションIDからインスタンスIDを取得できる", () => {
      cache.add("session1", "instance1");
      expect(cache.getInstanceId("session1")).toBe("instance1");
    });

    test("存在しないセッションIDの場合はundefinedを返す", () => {
      expect(cache.getInstanceId("nonexistent")).toBeUndefined();
    });
  });

  describe("clear", () => {
    test("全てのデータをクリアできる", () => {
      cache.add("session1", "instance1");
      cache.add("session2", "instance2");

      cache.clear();

      expect(cache.getSessionIds("instance1")).toStrictEqual([]);
      expect(cache.getSessionIds("instance2")).toStrictEqual([]);
      expect(cache.getInstanceId("session1")).toBeUndefined();
      expect(cache.getInstanceId("session2")).toBeUndefined();

      const stats = cache.getStats();
      expect(stats.instanceCount).toBe(0);
      expect(stats.sessionCount).toBe(0);
    });
  });

  describe("getStats", () => {
    test("統計情報を取得できる", () => {
      cache.add("session1", "instance1");
      cache.add("session2", "instance1");
      cache.add("session3", "instance2");

      const stats = cache.getStats();
      expect(stats.instanceCount).toBe(2);
      expect(stats.sessionCount).toBe(3);
    });

    test("空の場合は0を返す", () => {
      const stats = cache.getStats();
      expect(stats.instanceCount).toBe(0);
      expect(stats.sessionCount).toBe(0);
    });
  });

  describe("removeAllForInstance", () => {
    test("特定インスタンスの全セッションを削除できる", () => {
      cache.add("session1", "instance1");
      cache.add("session2", "instance1");
      cache.add("session3", "instance2");

      cache.removeAllForInstance("instance1");

      expect(cache.getSessionIds("instance1")).toStrictEqual([]);
      expect(cache.getSessionIds("instance2")).toStrictEqual(["session3"]);
      expect(cache.getInstanceId("session1")).toBeUndefined();
      expect(cache.getInstanceId("session2")).toBeUndefined();
      expect(cache.getInstanceId("session3")).toBe("instance2");
    });

    test("存在しないインスタンスを削除してもエラーにならない", () => {
      expect(() => cache.removeAllForInstance("nonexistent")).not.toThrow();
    });
  });

  describe("高速検索性能", () => {
    test("大量のセッションでも高速に検索できる", () => {
      const instanceCount = 100;
      const sessionsPerInstance = 10;

      // データを追加
      for (let i = 0; i < instanceCount; i++) {
        for (let j = 0; j < sessionsPerInstance; j++) {
          cache.add(`session_${i}_${j}`, `instance_${i}`);
        }
      }

      // 高速検索を確認
      const startTime = performance.now();
      const sessionIds = cache.getSessionIds("instance_50");
      const endTime = performance.now();

      expect(sessionIds).toHaveLength(sessionsPerInstance);
      expect(endTime - startTime).toBeLessThan(3); // 3ms以内

      // インスタンスIDの高速検索
      const startTime2 = performance.now();
      const instanceId = cache.getInstanceId("session_50_5");
      const endTime2 = performance.now();

      expect(instanceId).toBe("instance_50");
      expect(endTime2 - startTime2).toBeLessThan(1); // 1ms以内
    });
  });
});