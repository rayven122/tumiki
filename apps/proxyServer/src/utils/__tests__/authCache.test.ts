import { describe, test, expect, beforeEach, vi } from "vitest";
import { AuthCache } from "../cache/authCache.js";

describe("AuthCache", () => {
  let authCache: AuthCache;

  beforeEach(() => {
    authCache = new AuthCache();
    vi.clearAllMocks();
  });

  describe("get", () => {
    test("キャッシュミス時はundefinedを返す", () => {
      const result = authCache.get("tumiki_mcp_test_key");
      expect(result).toBeUndefined();
    });

    test("キャッシュヒット時は保存された値を返す", () => {
      const apiKey = "tumiki_mcp_test_key";
      const validation = {
        valid: true,
        userMcpServerInstance: {
          id: "instance-123",
          organizationId: "org-456",
        },
      };

      authCache.set(apiKey, validation);
      const result = authCache.get(apiKey);

      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(result?.userMcpServerInstanceId).toBe("instance-123");
      expect(result?.organizationId).toBe("org-456");
      expect(result?.hitCount).toBe(1);
    });

    test("ヒットカウントが増加する", () => {
      const apiKey = "tumiki_mcp_test_key";
      const validation = {
        valid: true,
        userMcpServerInstance: {
          id: "instance-123",
          organizationId: "org-456",
        },
      };

      authCache.set(apiKey, validation);

      authCache.get(apiKey);
      const result2 = authCache.get(apiKey);

      expect(result2?.hitCount).toBe(2);
    });

    test("無効なAPIキー情報も正しくキャッシュする", () => {
      const apiKey = "tumiki_mcp_invalid_key";
      const validation = {
        valid: false,
        error: "Invalid API key",
      };

      authCache.set(apiKey, validation);
      const result = authCache.get(apiKey);

      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(result?.error).toBe("Invalid API key");
      expect(result?.userMcpServerInstanceId).toBeUndefined();
    });
  });

  describe("set", () => {
    test("新しいエントリーを正しく保存する", () => {
      const apiKey = "tumiki_mcp_new_key";
      const validation = {
        valid: true,
        userMcpServerInstance: {
          id: "instance-789",
          organizationId: "org-101",
        },
      };

      authCache.set(apiKey, validation);
      const result = authCache.get(apiKey);

      expect(result).toBeDefined();
      expect(result?.userMcpServerInstanceId).toBe("instance-789");
      expect(result?.organizationId).toBe("org-101");
      expect(result?.createdAt).toBeDefined();
      expect(result?.hitCount).toBe(1);
    });

    test("既存のエントリーを上書きする", () => {
      const apiKey = "tumiki_mcp_existing_key";

      authCache.set(apiKey, {
        valid: true,
        userMcpServerInstance: {
          id: "old-instance",
          organizationId: "old-org",
        },
      });

      authCache.set(apiKey, {
        valid: true,
        userMcpServerInstance: {
          id: "new-instance",
          organizationId: "new-org",
        },
      });

      const result = authCache.get(apiKey);
      expect(result?.userMcpServerInstanceId).toBe("new-instance");
      expect(result?.organizationId).toBe("new-org");
    });
  });

  describe("delete", () => {
    test("存在するキーを削除できる", () => {
      const apiKey = "tumiki_mcp_delete_key";
      authCache.set(apiKey, {
        valid: true,
        userMcpServerInstance: {
          id: "instance-123",
          organizationId: "org-456",
        },
      });

      const deleted = authCache.delete(apiKey);
      expect(deleted).toBe(true);

      const result = authCache.get(apiKey);
      expect(result).toBeUndefined();
    });

    test("存在しないキーの削除はfalseを返す", () => {
      const deleted = authCache.delete("tumiki_mcp_nonexistent");
      expect(deleted).toBe(false);
    });
  });

  describe("clearByInstanceId", () => {
    test("特定のインスタンスIDのエントリーのみクリアする", () => {
      authCache.set("key1", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-1",
          organizationId: "org-1",
        },
      });

      authCache.set("key2", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-1",
          organizationId: "org-1",
        },
      });

      authCache.set("key3", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-2",
          organizationId: "org-2",
        },
      });

      const cleared = authCache.clearByInstanceId("instance-1");
      expect(cleared).toBe(2);

      expect(authCache.get("key1")).toBeUndefined();
      expect(authCache.get("key2")).toBeUndefined();
      expect(authCache.get("key3")).toBeDefined();
    });

    test("該当するエントリーがない場合は0を返す", () => {
      const cleared = authCache.clearByInstanceId("nonexistent-instance");
      expect(cleared).toBe(0);
    });
  });

  describe("clearByOrganizationId", () => {
    test("特定の組織IDのエントリーのみクリアする", () => {
      authCache.set("key1", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-1",
          organizationId: "org-1",
        },
      });

      authCache.set("key2", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-2",
          organizationId: "org-1",
        },
      });

      authCache.set("key3", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-3",
          organizationId: "org-2",
        },
      });

      const cleared = authCache.clearByOrganizationId("org-1");
      expect(cleared).toBe(2);

      expect(authCache.get("key1")).toBeUndefined();
      expect(authCache.get("key2")).toBeUndefined();
      expect(authCache.get("key3")).toBeDefined();
    });
  });

  describe("clear", () => {
    test("全てのエントリーをクリアする", () => {
      authCache.set("key1", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-1",
          organizationId: "org-1",
        },
      });

      authCache.set("key2", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-2",
          organizationId: "org-2",
        },
      });

      authCache.clear();

      expect(authCache.get("key1")).toBeUndefined();
      expect(authCache.get("key2")).toBeUndefined();
    });
  });

  describe("getStats", () => {
    test("統計情報を正しく取得する", () => {
      const stats = authCache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    test("操作後の統計情報が正しく更新される", () => {
      authCache.set("key1", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-1",
          organizationId: "org-1",
        },
      });

      authCache.get("key1"); // hit
      authCache.get("key2"); // miss
      authCache.delete("key1"); // delete

      const stats = authCache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe("getInfo", () => {
    test("キャッシュの詳細情報を取得する", () => {
      authCache.set("tumiki_mcp_test123", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-1",
          organizationId: "org-1",
        },
      });

      const info = authCache.getInfo();

      expect(info.stats).toBeDefined();
      expect(info.entries).toHaveLength(1);
      expect(info.entries[0]).toStrictEqual({
        apiKey: "tumiki_mcp...",
        valid: true,
        instanceId: "instance-1",
        organizationId: "org-1",
        age: expect.any(Number),
        hitCount: 0,
      });
    });
  });
});