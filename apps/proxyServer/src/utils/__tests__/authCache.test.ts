import { describe, test, expect, beforeEach, vi } from "vitest";
import { AuthCache } from "../cache/authCache.js";
import type { ValidationResult } from "../../libs/validateApiKey.js";

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
      const validation: ValidationResult = {
        valid: true,
        userMcpServerInstance: {
          id: "instance-123",
          organizationId: "org-456",
        } as ValidationResult["userMcpServerInstance"],
      };

      authCache.set(apiKey, validation);
      const result = authCache.get(apiKey);

      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(result?.userMcpServerInstanceId).toBe("instance-123");
      expect(result?.organizationId).toBe("org-456");
      expect(result?.hitCount).toBe(0); // 初期値は0
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
      const validation: ValidationResult = {
        valid: true,
        userMcpServerInstance: {
          id: "instance-789",
          organizationId: "org-101",
        } as ValidationResult["userMcpServerInstance"],
      };

      authCache.set(apiKey, validation);
      const result = authCache.get(apiKey);

      expect(result).toBeDefined();
      expect(result?.userMcpServerInstanceId).toBe("instance-789");
      expect(result?.organizationId).toBe("org-101");
      expect(result?.createdAt).toBeDefined();
      expect(result?.hitCount).toBe(0); // 初期値は0
    });

    test("既存のエントリーを上書きする", () => {
      const apiKey = "tumiki_mcp_existing_key";

      authCache.set(apiKey, {
        valid: true,
        userMcpServerInstance: {
          id: "old-instance",
          organizationId: "old-org",
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

      authCache.set(apiKey, {
        valid: true,
        userMcpServerInstance: {
          id: "new-instance",
          organizationId: "new-org",
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

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
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

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
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

      authCache.set("key2", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-1",
          organizationId: "org-1",
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

      authCache.set("key3", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-2",
          organizationId: "org-2",
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

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
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

      authCache.set("key2", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-2",
          organizationId: "org-1",
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

      authCache.set("key3", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-3",
          organizationId: "org-2",
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

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
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

      authCache.set("key2", {
        valid: true,
        userMcpServerInstance: {
          id: "instance-2",
          organizationId: "org-2",
        } as ValidationResult["userMcpServerInstance"],
      } as ValidationResult);

      authCache.clear();

      expect(authCache.get("key1")).toBeUndefined();
      expect(authCache.get("key2")).toBeUndefined();
    });
  });
});
