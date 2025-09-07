/**
 * @fileoverview ドメイン固有キャッシュのテストスイート
 */

import { describe, test, expect } from "vitest";
import {
  createToolsCache,
  createAuthCache,
  createSessionCache,
  createDataCache,
  type ServerConfig,
} from "../../../utils/cache/domains.js";

const mockTool = {
  name: "test_tool",
  id: "test_tool_id",
  description: "A test tool",
  inputSchema: {
    type: "object",
    properties: {},
  },
  isEnabled: true,
  mcpServerId: "test_server",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createToolsCache", () => {
  test("基本的なツールキャッシュ操作", () => {
    const cache = createToolsCache();

    const tools = [mockTool];
    const hash = "test-hash";
    const key = cache.generateKey("server-123", hash);

    cache.setTools(key, tools, hash);
    const cachedTools = cache.getTools(key);

    expect(cachedTools).toStrictEqual(tools);
  });

  test("キー生成", () => {
    const cache = createToolsCache();

    const key = cache.generateKey("server-123", "hash456");
    expect(key).toBe("tools:server-123:hash456");
  });

  test("サーバー無効化", () => {
    const cache = createToolsCache();

    const tools = [mockTool];
    const key1 = cache.generateKey("server-123", "hash1");
    const key2 = cache.generateKey("server-123", "hash2");
    const key3 = cache.generateKey("server-456", "hash3");

    cache.setTools(key1, tools, "hash1");
    cache.setTools(key2, tools, "hash2");
    cache.setTools(key3, tools, "hash3");

    expect(cache.getStats().entryCount).toBe(3);

    cache.invalidateServer("server-123");

    expect(cache.getStats().entryCount).toBe(1);
    expect(cache.getTools(key1)).toBeNull();
    expect(cache.getTools(key2)).toBeNull();
    expect(cache.getTools(key3)).toStrictEqual(tools);
  });

  test("サーバー設定ハッシュ生成", () => {
    const cache = createToolsCache();

    const configs1: ServerConfig[] = [
      { name: "server1", toolNames: ["tool1", "tool2"] },
      { name: "server2", toolNames: ["tool3"] },
    ];

    const configs2: ServerConfig[] = [
      { name: "server2", toolNames: ["tool3"] },
      { name: "server1", toolNames: ["tool1", "tool2"] },
    ];

    const hash1 = cache.generateServerConfigHash(configs1);
    const hash2 = cache.generateServerConfigHash(configs2);

    // 順序が異なっても同じハッシュ
    expect(hash1).toBe(hash2);
  });
});

describe("createAuthCache", () => {
  test("基本的な認証キャッシュ操作", () => {
    const cache = createAuthCache<{ token: string }>();

    cache.set("token-123", { token: "bearer-token" });
    expect(cache.get("token-123")).toStrictEqual({ token: "bearer-token" });
  });

  test("ユーザーキー生成", () => {
    const cache = createAuthCache();

    const key = cache.generateUserKey("user-123", "access_token");
    expect(key).toBe("auth:user:user-123:access_token");
  });

  test("ユーザー無効化", () => {
    const cache = createAuthCache<{ token: string }>();

    const key1 = cache.generateUserKey("user-123", "access_token");
    const key2 = cache.generateUserKey("user-123", "refresh_token");
    const key3 = cache.generateUserKey("user-456", "access_token");

    cache.set(key1, { token: "token1" });
    cache.set(key2, { token: "token2" });
    cache.set(key3, { token: "token3" });

    expect(cache.getStats().entryCount).toBe(3);

    cache.invalidateUser("user-123");

    expect(cache.getStats().entryCount).toBe(1);
    expect(cache.get(key1)).toBeNull();
    expect(cache.get(key2)).toBeNull();
    expect(cache.get(key3)).toStrictEqual({ token: "token3" });
  });
});

describe("createSessionCache", () => {
  test("基本的なセッションキャッシュ操作", () => {
    const cache = createSessionCache<{ userId: string }>();

    const sessionData = { userId: "user-123" };
    cache.set("session-123", sessionData);

    expect(cache.get("session-123")).toStrictEqual(sessionData);
  });

  test("セッションキー生成", () => {
    const cache = createSessionCache();

    const key = cache.generateSessionKey("abc123");
    expect(key).toBe("session:abc123");
  });

  test("ユーザーセッション無効化", () => {
    const cache = createSessionCache<{ userId: string }>();

    cache.set("session:user:user-123:1", { userId: "user-123" });
    cache.set("session:user:user-123:2", { userId: "user-123" });
    cache.set("session:user:user-456:1", { userId: "user-456" });

    expect(cache.getStats().entryCount).toBe(3);

    cache.invalidateUserSessions("user-123");

    expect(cache.getStats().entryCount).toBe(1);
    expect(cache.get("session:user:user-456:1")).toStrictEqual({
      userId: "user-456",
    });
  });
});

describe("createDataCache", () => {
  test("基本的なデータキャッシュ操作", () => {
    const cache = createDataCache<{ value: number }>("test");

    const data = { value: 42 };
    cache.set("key1", data);

    expect(cache.get("key1")).toStrictEqual(data);
  });

  test("名前空間付きキー生成", () => {
    const cache = createDataCache("user-profiles");

    const key = cache.generateKey("user", "123", "profile");
    expect(key).toBe("user-profiles:user:123:profile");
  });

  test("名前空間無効化", () => {
    const cache = createDataCache<{ value: string }>("data");

    cache.set("data:cache:item1", { value: "value1" });
    cache.set("data:cache:item2", { value: "value2" });
    cache.set("data:other:item3", { value: "value3" });

    expect(cache.getStats().entryCount).toBe(3);

    cache.invalidateNamespace("cache");

    expect(cache.getStats().entryCount).toBe(1);
    expect(cache.get("data:cache:item1")).toBeNull();
    expect(cache.get("data:cache:item2")).toBeNull();
    expect(cache.get("data:other:item3")).toStrictEqual({ value: "value3" });
  });

  test("異なる名前空間のキャッシュは独立", () => {
    const cache1 = createDataCache<{ value: string }>("namespace1");
    const cache2 = createDataCache<{ value: string }>("namespace2");

    cache1.set("key1", { value: "value1" });
    cache2.set("key1", { value: "value2" });

    expect(cache1.get("key1")).toStrictEqual({ value: "value1" });
    expect(cache2.get("key1")).toStrictEqual({ value: "value2" });
    expect(cache1.getStats().entryCount).toBe(1);
    expect(cache2.getStats().entryCount).toBe(1);
  });
});
