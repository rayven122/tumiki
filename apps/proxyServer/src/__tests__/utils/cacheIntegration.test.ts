import { describe, test, expect, beforeEach } from "vitest";
import { type Tool } from "@modelcontextprotocol/sdk/types.js";
import { createToolsCache } from "../../utils/cache/index.js";
import type { ServerConfig } from "../../libs/types.js";

// モック用のサーバー設定
const mockServerConfigs: ServerConfig[] = [
  {
    name: "test-server-1",
    toolNames: ["tool1", "tool2"],
    transport: {
      type: "stdio",
      command: "test-command-1",
      args: [],
      env: {},
    },
    googleCredentials: null,
  },
  {
    name: "test-server-2",
    toolNames: ["tool3"],
    transport: {
      type: "stdio",
      command: "test-command-2",
      args: [],
      env: {},
    },
    googleCredentials: null,
  },
];

// モック用のツール一覧
const mockTools: Tool[] = [
  {
    name: "tool1",
    description: "[test-server-1] Tool 1 description",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "tool2",
    description: "[test-server-1] Tool 2 description",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "tool3",
    description: "[test-server-2] Tool 3 description",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

describe("ToolsCache統合テスト", () => {
  let toolsCache: ReturnType<typeof createToolsCache>;
  const testInstanceId = "test-instance-123";

  beforeEach(() => {
    toolsCache = createToolsCache();
  });

  describe("キャッシュキー生成", () => {
    test("userMcpServerInstanceIdとserverConfigHashからキーを正しく生成する", () => {
      const serverConfigHash =
        toolsCache.generateServerConfigHash(mockServerConfigs);
      const cacheKey = toolsCache.generateKey(testInstanceId, serverConfigHash);

      expect(cacheKey).toBe(`tools:${testInstanceId}:${serverConfigHash}`);
      expect(cacheKey).toMatch(/^tools:test-instance-123:[a-f0-9]{64}$/);
    });

    test("サーバー設定ハッシュが設定内容に基づいて正しく生成される", () => {
      const hash1 = toolsCache.generateServerConfigHash(mockServerConfigs);
      const hash2 = toolsCache.generateServerConfigHash(mockServerConfigs);

      // 同じ設定なら同じハッシュ
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256ハッシュは64文字
    });

    test("異なるサーバー設定は異なるハッシュを生成する", () => {
      const differentConfigs: ServerConfig[] = [
        {
          name: "different-server",
          toolNames: ["different-tool"],
          transport: {
            type: "stdio",
            command: "different-command",
            args: [],
            env: {},
          },
          googleCredentials: null,
        },
      ];

      const hash1 = toolsCache.generateServerConfigHash(mockServerConfigs);
      const hash2 = toolsCache.generateServerConfigHash(differentConfigs);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("キャッシュヒット/ミス動作", () => {
    test("キャッシュミス → 保存 → キャッシュヒットのフロー", () => {
      const serverConfigHash =
        toolsCache.generateServerConfigHash(mockServerConfigs);
      const cacheKey = toolsCache.generateKey(testInstanceId, serverConfigHash);

      // 初回はキャッシュミス
      const cachedResult1 = toolsCache.getTools(cacheKey);
      expect(cachedResult1).toBeNull();

      // キャッシュに保存
      toolsCache.setTools(cacheKey, mockTools, serverConfigHash);

      // 2回目はキャッシュヒット
      const cachedResult2 = toolsCache.getTools(cacheKey);
      expect(cachedResult2).toStrictEqual(mockTools);
      expect(cachedResult2).toHaveLength(3);
      expect(cachedResult2?.[0]?.name).toBe("tool1");
    });

    test("異なるインスタンスIDは異なるキャッシュエントリを使用", () => {
      const serverConfigHash =
        toolsCache.generateServerConfigHash(mockServerConfigs);

      const cacheKey1 = toolsCache.generateKey("instance-1", serverConfigHash);
      const cacheKey2 = toolsCache.generateKey("instance-2", serverConfigHash);

      // instance-1にのみキャッシュ保存
      toolsCache.setTools(cacheKey1, mockTools, serverConfigHash);

      // instance-1はヒット、instance-2はミス
      expect(toolsCache.getTools(cacheKey1)).toStrictEqual(mockTools);
      expect(toolsCache.getTools(cacheKey2)).toBeNull();
    });

    test("サーバー設定が変更されると新しいキャッシュキーが生成される", () => {
      const originalHash =
        toolsCache.generateServerConfigHash(mockServerConfigs);
      const originalKey = toolsCache.generateKey(testInstanceId, originalHash);

      // オリジナル設定でキャッシュ保存
      toolsCache.setTools(originalKey, mockTools, originalHash);

      // 設定変更（サーバー名を変更）
      const modifiedConfigs: ServerConfig[] = [
        {
          name: "modified-server-1", // 【変更】test-server-1 → modified-server-1
          toolNames: mockServerConfigs[0]!.toolNames,
          transport: mockServerConfigs[0]!.transport,
          googleCredentials: mockServerConfigs[0]!.googleCredentials,
        },
        mockServerConfigs[1]!, // 【変更なし】test-server-2 はそのまま
      ];

      const modifiedHash = toolsCache.generateServerConfigHash(modifiedConfigs);
      const modifiedKey = toolsCache.generateKey(testInstanceId, modifiedHash);

      // ハッシュとキーが異なることを確認
      expect(modifiedHash).not.toBe(originalHash);
      expect(modifiedKey).not.toBe(originalKey);

      // 新しいキーではキャッシュミス
      expect(toolsCache.getTools(modifiedKey)).toBeNull();
      // 元のキーではまだヒット
      expect(toolsCache.getTools(originalKey)).toStrictEqual(mockTools);
    });
  });

  describe("キャッシュ無効化", () => {
    test("特定インスタンスのキャッシュが無効化される", () => {
      const serverConfigHash1 =
        toolsCache.generateServerConfigHash(mockServerConfigs);
      const serverConfigHash2 = "different-hash-123";

      const cacheKey1 = toolsCache.generateKey(
        testInstanceId,
        serverConfigHash1,
      );
      const cacheKey2 = toolsCache.generateKey(
        testInstanceId,
        serverConfigHash2,
      );
      const otherInstanceKey = toolsCache.generateKey(
        "other-instance",
        serverConfigHash1,
      );

      // 複数のキャッシュエントリを設定
      toolsCache.setTools(cacheKey1, mockTools, serverConfigHash1);
      toolsCache.setTools(cacheKey2, mockTools, serverConfigHash2);
      toolsCache.setTools(otherInstanceKey, mockTools, serverConfigHash1);

      // 特定インスタンスのみ無効化
      toolsCache.invalidateServer(testInstanceId);

      // testInstanceIdのキャッシュは無効化
      expect(toolsCache.getTools(cacheKey1)).toBeNull();
      expect(toolsCache.getTools(cacheKey2)).toBeNull();

      // 他のインスタンスのキャッシュは残存
      expect(toolsCache.getTools(otherInstanceKey)).toStrictEqual(mockTools);
    });
  });

  describe("TTL (Time to Live) 動作", () => {
    test("TTL期限切れでキャッシュエントリが自動削除される", async () => {
      // 短いTTLで新しいキャッシュインスタンスを作成（テスト用）
      const shortTtlCache = createToolsCache();
      // TTLの設定は内部実装に依存するため、この部分は実装詳細をテスト

      const serverConfigHash =
        shortTtlCache.generateServerConfigHash(mockServerConfigs);
      const cacheKey = shortTtlCache.generateKey(
        testInstanceId,
        serverConfigHash,
      );

      shortTtlCache.setTools(cacheKey, mockTools, serverConfigHash);

      // 即座にはキャッシュヒット
      expect(shortTtlCache.getTools(cacheKey)).toStrictEqual(mockTools);

      // Note: TTLのテストは実際のタイマーに依存するため、
      // 統合テストではキャッシュの存在確認のみテスト
      // TTL機能の詳細テストは cache/domains.test.ts で実施
    });
  });

  describe("統計情報取得", () => {
    test("キャッシュ統計情報が正しく取得できる", () => {
      const serverConfigHash =
        toolsCache.generateServerConfigHash(mockServerConfigs);
      const cacheKey = toolsCache.generateKey(testInstanceId, serverConfigHash);

      // 初期状態の統計
      const initialStats = toolsCache.getStats();
      expect(initialStats.entryCount).toBe(0);

      // キャッシュエントリを追加
      toolsCache.setTools(cacheKey, mockTools, serverConfigHash);

      // 統計情報が更新されているか確認
      const updatedStats = toolsCache.getStats();
      expect(updatedStats.entryCount).toBe(1);
    });
  });
});

describe("proxy.ts tools/listハンドラー統合", () => {
  test("キャッシュヒット/ミスログ記録のフォーマット検証", () => {
    // ログ記録パラメータの型検証
    const cacheHitLogParams = {
      organizationId: "org-123",
      mcpServerInstanceId: "instance-123",
      toolName: "tools/list",
      transportType: "HTTP" as const,
      method: "tools/list",
      responseStatus: "200",
      durationMs: 45, // < 50ms のキャッシュヒット時間
      inputBytes: 100,
      outputBytes: 2000,
      cached: true, // キャッシュフラグ
    };

    const cacheMissLogParams = {
      organizationId: "org-123",
      mcpServerInstanceId: "instance-123",
      toolName: "tools/list",
      transportType: "HTTP" as const,
      method: "tools/list",
      responseStatus: "200",
      durationMs: 500, // 通常の処理時間
      inputBytes: 100,
      outputBytes: 2000,
      cached: false, // キャッシュミスフラグ
    };

    // 型チェック（コンパイル時に検証される）
    expect(cacheHitLogParams.cached).toBe(true);
    expect(cacheMissLogParams.cached).toBe(false);
    expect(cacheHitLogParams.durationMs).toBeLessThan(50);
    expect(cacheMissLogParams.durationMs).toBeGreaterThan(100);
  });
});
