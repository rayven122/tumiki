# MCPプロキシサーバー パフォーマンス改善実装計画

## 📑 目次

### PR別実装計画

1. [PR #1: MCPコネクションプール基盤実装](#pr-1-mcpコネクションプール基盤実装)
2. [PR #2: Tools/listキャッシュ機構実装](#pr-2-toolslistキャッシュ機構実装)
3. [PR #3: proxy.tsへの接続プール統合](#pr-3-proxytsへの接続プール統合)
4. [PR #4: tools/listキャッシュ統合](#pr-4-toolslistキャッシュ統合)
5. [PR #5: CallToolへの接続プール適用](#pr-5-calltoolへの接続プール適用)
6. [PR #6: DBログ最適化とクリーンアップ](#pr-6-dbログ最適化とクリーンアップ)
7. [PR #7: 設定最適化とモニタリング強化](#pr-7-設定最適化とモニタリング強化)
8. [PR #8: パフォーマンステスト改善](#pr-8-パフォーマンステスト改善)

### その他

- [期待効果](#-全体の期待効果)
- [注意事項](#️-注意事項)
- [チェックリスト](#-実装チェックリスト)

---

## 🎯 概要

MCPプロキシサーバーの`tools/list`取得遅延とスケーラビリティ問題を解決するため、**MCPコネクションプール**と**LRUキャッシュ**を実装してパフォーマンスを向上させます。

### パフォーマンス最適化方法

**1. MCPコネクションプール**

- MCPサーバーとの接続を使い回してレスポンス時間短縮
- 2-3秒 → 500ms（初回）、50ms（2回目以降）

**2. LRUキャッシュ**

- `tools/list`結果をメモリに保存して高速化
- キャッシュヒット時は50ms以下で即座にレスポンス

**制約条件**：2GBメモリ、既存機能影響なし、段階的実装

---

## 📋 PR分割実装計画

### PR #1: MCPコネクションプール基盤実装

#### 目的

MCPクライアント接続の再利用基盤を構築し、接続確立オーバーヘッドを削減

#### 実装ファイル

**🆕 `src/utils/mcpConnectionPool.ts`**

```typescript
// メイン接続プール管理クラス
export class MCPConnectionPool {
  private pools = new Map<string, ServerConnectionPool>();
  private maxTotalConnections = 30; // 全体で最大30接続（メモリ制約）

  async getConnection(
    userMcpServerInstanceId: string,
    serverName: string,
  ): Promise<MCPConnection>;
  async releaseConnection(connection: MCPConnection): Promise<void>;
  getPoolStats(): PoolStats;
  cleanup(): Promise<void>;
}

// サーバー別接続プール
class ServerConnectionPool {
  private connections: MCPConnection[] = [];
  private activeConnections = 0;
  private readonly maxConnections = 3; // サーバーあたり最大3接続
  private readonly idleTimeout = 180000; // 3分でタイムアウト

  async acquire(): Promise<MCPConnection>;
  release(connection: MCPConnection): void;
  private createNewConnection(): Promise<MCPConnection>;
  private cleanupIdleConnections(): void;
}

// 接続ラッパークラス
class MCPConnection {
  public client: Client;
  public lastUsed: number;
  public isActive: boolean;
  private transport: Transport;

  constructor(client: Client, transport: Transport);
  async healthCheck(): Promise<boolean>;
  async close(): Promise<void>;
}

// シングルトンインスタンス
export const mcpConnectionPool = new MCPConnectionPool();
```

**実装詳細**：

- 接続プールの基本機能（取得・返却・クリーンアップ）
- メモリ効率を重視した設計（最大30接続）
- アイドルタイムアウト機能（3分）
- ヘルスチェック機能
- 統計情報取得機能

#### テスト

**🆕 `src/utils/__tests__/mcpConnectionPool.test.ts`**

```typescript
describe("MCPConnectionPool", () => {
  test("接続の作成と取得");
  test("接続の返却とプールへの保存");
  test("最大接続数制限");
  test("アイドルタイムアウト");
  test("メモリ使用量測定");
  test("cleanup機能");
});
```

---

### PR #2: Tools/listキャッシュ機構実装

#### 目的

`tools/list`結果のインメモリキャッシュで即座にパフォーマンス向上

#### 実装ファイル

**🆕 `src/utils/toolsCache.ts`**

```typescript
import LRU from "lru-cache";

// キャッシュエントリの型定義
interface ToolsCacheEntry {
  tools: Tool[];
  timestamp: number;
  serverConfigHash: string;
}

// キャッシュキー生成
export const generateCacheKey = (
  userMcpServerInstanceId: string,
  serverConfigHash: string,
): string => {
  return `tools:${userMcpServerInstanceId}:${serverConfigHash}`;
};

// メインキャッシュクラス
export class ToolsCache {
  private cache: LRU<string, ToolsCacheEntry>;
  private readonly maxSize = 50; // 最大50エントリ
  private readonly ttl = 5 * 60 * 1000; // 5分TTL
  private readonly maxMemory = 50 * 1024 * 1024; // 50MB制限

  constructor();
  set(key: string, tools: Tool[], serverConfigHash: string): void;
  get(key: string): Tool[] | null;
  invalidate(userMcpServerInstanceId: string): void;
  getStats(): CacheStats;
  clear(): void;
}

// サーバー設定のハッシュ生成
export const generateServerConfigHash = (
  serverConfigs: ServerConfig[],
): string => {
  // サーバー設定の内容をハッシュ化
  const configString = JSON.stringify(
    serverConfigs.map((config) => ({
      name: config.name,
      toolNames: config.toolNames,
      // 環境変数は除外（セキュリティ考慮）
    })),
  );
  return crypto.createHash("md5").update(configString).digest("hex");
};

// シングルトンインスタンス
export const toolsCache = new ToolsCache();
```

**実装詳細**：

- LRUキャッシュによる効率的なメモリ使用
- TTL（Time To Live）による自動expiry
- サーバー設定変更の検知とキャッシュ無効化
- メモリ使用量制限（50MB）
- 統計情報（ヒット率、エントリ数など）

#### テスト

**🆕 `src/utils/__tests__/toolsCache.test.ts`**

```typescript
describe("ToolsCache", () => {
  test("キャッシュの保存と取得");
  test("TTLによる自動削除");
  test("LRUによる古いエントリ削除");
  test("設定変更時の無効化");
  test("メモリ制限の動作");
  test("統計情報の取得");
});
```

---

### PR #3: proxy.tsへの接続プール統合

#### 目的

実際のMCP通信で接続プールを使用し、接続確立時間を短縮

#### 修正ファイル

**🔧 `src/utils/proxy.ts`**

```typescript
import { mcpConnectionPool } from "./mcpConnectionPool.js";

// 修正箇所1: getServer関数の変更
export const getServer = async (
  serverIdentifier: string,
  transportType: TransportType,
  isValidationMode = false,
) => {
  // 既存の処理...

  // List Tools Handler の修正
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const startTime = Date.now();

    try {
      // 🆕 接続プールから接続を取得
      const connections = await getPooledConnections(userMcpServerInstanceId);

      const allTools: Tool[] = [];

      for (const { client, serverName } of connections) {
        try {
          const result = await client.request(
            {
              method: "tools/list",
              params: { _meta: request.params?._meta },
            },
            ListToolsResultSchema,
          );

          // ツール情報の処理...
          allTools.push(...processedTools);
        } catch (error) {
          // エラーハンドリング
        }
      }

      // 🆕 接続をプールに返却
      await returnConnectionsToPool(connections);

      return { tools: allTools };
    } catch (error) {
      // エラー時も接続を適切に返却
      throw error;
    }
  });
};

// 🆕 プールから接続を取得する関数
async function getPooledConnections(userMcpServerInstanceId: string) {
  const serverConfigs = await getServerConfigsByInstanceId(
    userMcpServerInstanceId,
  );
  const connections = [];

  for (const serverConfig of serverConfigs) {
    try {
      const connection = await mcpConnectionPool.getConnection(
        userMcpServerInstanceId,
        serverConfig.name,
      );
      connections.push({
        connection,
        serverName: serverConfig.name,
        client: connection.client,
      });
    } catch (error) {
      // 接続失敗時の処理
    }
  }

  return connections;
}

// 🆕 接続をプールに返却する関数
async function returnConnectionsToPool(connections: PooledConnection[]) {
  await Promise.all(
    connections.map(({ connection }) =>
      mcpConnectionPool.releaseConnection(connection),
    ),
  );
}
```

**実装詳細**：

- 既存の`createClients`呼び出しを接続プール使用に変更
- エラーハンドリング時も適切に接続をプールに返却
- 接続の取得・返却ロジックを関数化
- 既存のタイムアウト処理は維持

---

### PR #4: tools/listキャッシュ統合

#### 目的

キャッシュ機構を実際の`tools/list`処理に統合し、レスポンス時間を大幅短縮

#### 修正ファイル

**🔧 `src/utils/proxy.ts`**

```typescript
import {
  toolsCache,
  generateCacheKey,
  generateServerConfigHash,
} from "./toolsCache.js";

// ListToolsRequestSchema ハンドラーの修正
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  const startTime = Date.now();

  try {
    // サーバー設定を取得
    const serverConfigs = await getServerConfigsByInstanceId(
      userMcpServerInstanceId,
    );

    // 🆕 キャッシュキーを生成
    const serverConfigHash = generateServerConfigHash(serverConfigs);
    const cacheKey = generateCacheKey(
      userMcpServerInstanceId,
      serverConfigHash,
    );

    // 🆕 キャッシュから取得を試行
    const cachedTools = toolsCache.get(cacheKey);
    if (cachedTools) {
      // キャッシュヒット時のログ記録
      const durationMs = Date.now() - startTime;
      await logCacheHit(userMcpServerInstanceId, durationMs);

      return { tools: cachedTools };
    }

    // キャッシュミス時は通常の処理
    const connections = await getPooledConnections(userMcpServerInstanceId);
    const allTools: Tool[] = [];

    // 既存のツール取得ロジック...

    // 🆕 結果をキャッシュに保存
    toolsCache.set(cacheKey, allTools, serverConfigHash);

    await returnConnectionsToPool(connections);

    const durationMs = Date.now() - startTime;
    await logCacheMiss(userMcpServerInstanceId, durationMs);

    return { tools: allTools };
  } catch (error) {
    // エラー処理
    throw error;
  }
});

// 🆕 キャッシュヒット時のログ記録
async function logCacheHit(
  userMcpServerInstanceId: string,
  durationMs: number,
) {
  void logMcpRequest({
    mcpServerInstanceId: userMcpServerInstanceId,
    toolName: "tools/list",
    method: "tools/list",
    responseStatus: "200",
    durationMs,
    inputBytes: 0,
    outputBytes: 0,
    cached: true, // 🆕 キャッシュフラグ
  });
}
```

**実装詳細**：

- キャッシュキー生成（userMcpServerInstanceId + 設定ハッシュ）
- キャッシュヒット時の即座レスポンス
- キャッシュミス時の通常処理 + 結果保存
- ログ記録にキャッシュ情報を追加

---

### PR #5: CallToolへの接続プール適用

#### 目的

`tools/call`処理でも接続プールを使用し、ツール実行の高速化

#### 修正ファイル

**🔧 `src/utils/proxy.ts`**

```typescript
// CallToolRequestSchema ハンドラーの修正
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  try {
    // 🆕 プールから該当ツールを持つ接続を取得
    const connection = await getConnectionForTool(
      userMcpServerInstanceId,
      name,
    );

    if (!connection) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      // ツール実行
      const result = await connection.client.request(
        {
          method: "tools/call",
          params: {
            name,
            arguments: args ?? {},
            _meta: { progressToken: request.params._meta?.progressToken },
          },
        },
        CompatibilityCallToolResultSchema,
      );

      return result;
    } finally {
      // 🆕 接続をプールに返却
      await mcpConnectionPool.releaseConnection(connection);
    }
  } catch (error) {
    // エラー処理
    throw error;
  }
});

// 🆕 特定ツール用の接続を取得
async function getConnectionForTool(
  userMcpServerInstanceId: string,
  toolName: string,
): Promise<MCPConnection | null> {
  const serverConfigs = await getServerConfigsByInstanceId(
    userMcpServerInstanceId,
  );

  // ツール名から対応するサーバーを特定
  for (const serverConfig of serverConfigs) {
    if (serverConfig.toolNames.includes(toolName)) {
      return mcpConnectionPool.getConnection(
        userMcpServerInstanceId,
        serverConfig.name,
      );
    }
  }

  return null;
}
```

**実装詳細**：

- ツール名から適切なサーバー接続を特定
- 接続プールからの取得・返却
- エラー時も適切な接続管理
- 既存のタイムアウト・ログ処理は維持

---

### PR #6: DBログ最適化とクリーンアップ

#### 目的

DBログの無制限蓄積を防止し、ディスク容量とDB性能を保護

#### 実装ファイル

**🔧 `src/utils/proxy.ts`**

```typescript
// tools/listログの詳細データ除外
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  // 既存の処理...

  // 🆕 tools/listは詳細データをログに記録しない
  if (userMcpServerInstance && !isValidationMode) {
    void logMcpRequest({
      organizationId: userMcpServerInstance.organizationId,
      mcpServerInstanceId: userMcpServerInstance.id,
      toolName: "tools/list",
      transportType: transportType,
      method: "tools/list",
      responseStatus: "200",
      durationMs,
      inputBytes: calculateDataSize(request.params ?? {}),
      outputBytes: calculateDataSize(result.tools ?? []),
      // 🆕 詳細データは記録しない（tools/listのみ）
      // requestData: 記録しない
      // responseData: 記録しない
    });
  }
});
```

**🆕 `src/utils/logCleanup.ts`**

```typescript
// ログクリーンアップ機能
export class LogCleanupService {
  private readonly retentionDays = 30; // 30日保持

  // 日次クリーンアップ
  async cleanupExpiredLogs(): Promise<void> {
    const cutoffDate = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );

    const result = await db.mcpRequestLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired log entries`);
  }

  // 定期実行開始
  startCleanupScheduler(): void {
    // 毎日午前2時に実行
    setInterval(
      async () => {
        try {
          await this.cleanupExpiredLogs();
        } catch (error) {
          logger.error("Log cleanup failed", error);
        }
      },
      24 * 60 * 60 * 1000,
    ); // 24時間ごと
  }
}

// シングルトンインスタンス
export const logCleanupService = new LogCleanupService();
```

**🔧 `src/index.ts`**

```typescript
import { logCleanupService } from "./utils/logCleanup.js";

// サーバー起動時にクリーンアップ開始
const startServer = (): void => {
  // 既存の処理...

  // 🆕 ログクリーンアップ開始
  if (process.env.NODE_ENV === "production") {
    logCleanupService.startCleanupScheduler();
    logger.info("Log cleanup scheduler started");
  }
};
```

**実装詳細**：

- tools/listリクエストの詳細データ（requestData/responseData）を記録対象外に
- 30日経過したログの自動削除機能
- 本番環境での定期クリーンアップ実行
- ログクリーンアップの監視・エラーハンドリング

#### テスト

**🆕 `src/utils/__tests__/logCleanup.test.ts`**

```typescript
describe("LogCleanupService", () => {
  test("期限切れログの削除");
  test("保持期間内ログの保護");
  test("クリーンアップエラーハンドリング");
  test("スケジューラーの動作確認");
});
```

---

### PR #7: 設定最適化とモニタリング強化

#### 目的

2GBメモリ制約に最適化された設定と監視機能の追加

#### 修正ファイル

**🔧 `src/libs/config.ts`**

```typescript
export const config = {
  // 🆕 接続プール設定
  connectionPool: {
    maxTotalConnections: 30, // 全体最大接続数（メモリ制約考慮）
    maxConnectionsPerServer: 3, // サーバーあたり最大接続数
    idleTimeout: 180000, // 3分でアイドル接続切断
    healthCheckInterval: 60000, // 1分ごとのヘルスチェック
    maxRetries: 3, // 接続失敗時のリトライ数
  },

  // 🆕 キャッシュ設定
  cache: {
    maxEntries: 50, // 最大キャッシュエントリ数
    ttl: 300000, // 5分TTL
    maxMemoryMB: 50, // 最大メモリ使用量
    cleanupInterval: 60000, // 1分ごとのクリーンアップ
  },

  // 既存のタイムアウト設定を最適化
  timeouts: {
    request: 15000, // 15秒（短縮）
    connection: 300000, // 5分（セッション）
    keepalive: 30000, // 30秒
  },
};
```

**🆕 `src/utils/performanceMonitor.ts`**

```typescript
// パフォーマンス監視クラス
export class PerformanceMonitor {
  private metrics = new Map<string, MetricData>();

  // メトリクス記録
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void;

  // 統計情報取得
  getMetrics(): MetricsReport;

  // メモリアラート
  checkMemoryUsage(): MemoryStatus;

  // 接続プール統計
  getPoolStats(): PoolMetrics;
}

// 🆕 定期的なメトリクス収集
setInterval(() => {
  const monitor = getPerformanceMonitor();

  // メモリ使用量チェック
  const memoryStatus = monitor.checkMemoryUsage();
  if (memoryStatus.usage > 0.8) {
    // 80%超過でアラート
    logger.warn("High memory usage detected", memoryStatus);
  }

  // 接続プール統計
  const poolStats = monitor.getPoolStats();
  logger.info("Connection pool stats", poolStats);
}, 60000); // 1分ごと
```

#### 追加ファイル

**🆕 `src/routes/health/metrics.ts`**

```typescript
// メトリクス取得エンドポイント
export const handleMetrics = (req: Request, res: Response): void => {
  const monitor = getPerformanceMonitor();
  const metrics = {
    connectionPool: mcpConnectionPool.getStats(),
    cache: toolsCache.getStats(),
    memory: process.memoryUsage(),
    system: monitor.getMetrics(),
  };

  res.json(metrics);
};
```

---

### PR #7: パフォーマンステスト改善

#### 目的

改善効果を定量的に測定し、回帰を防止

#### 修正ファイル

**🔧 `scripts/perf-test.ts`**

```typescript
// 🆕 接続プール効果測定
async function measureConnectionPoolEffect() {
  console.log("🔍 接続プール効果測定中...");

  // プールなしでのテスト
  const withoutPoolResults = await runTestSuite("without-pool");

  // プールありでのテスト
  const withPoolResults = await runTestSuite("with-pool");

  // 比較レポート生成
  generateConnectionPoolReport(withoutPoolResults, withPoolResults);
}

// 🆕 キャッシュ効果測定
async function measureCacheEffect() {
  console.log("💾 キャッシュ効果測定中...");

  const results = [];

  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();
    await makeToolsListRequest();
    const duration = Date.now() - startTime;

    results.push({
      request: i + 1,
      duration,
      cached: i > 0, // 2回目以降はキャッシュヒット想定
    });
  }

  generateCacheReport(results);
}

// 🆕 メモリ使用量プロファイリング
async function profileMemoryUsage() {
  console.log("🧠 メモリプロファイリング中...");

  const baseline = process.memoryUsage();

  // 負荷をかけながらメモリ使用量を監視
  const memorySnapshots = [];
  const testDuration = 5 * 60 * 1000; // 5分間
  const interval = setInterval(() => {
    memorySnapshots.push({
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      poolStats: mcpConnectionPool.getStats(),
      cacheStats: toolsCache.getStats(),
    });
  }, 5000); // 5秒ごと

  // 負荷テスト実行
  await runLoadTest({
    connections: 20,
    duration: testDuration / 1000,
  });

  clearInterval(interval);
  generateMemoryReport(baseline, memorySnapshots);
}

// 🆕 統合パフォーマンスレポート
function generatePerformanceReport(results: TestResults) {
  const report = {
    summary: {
      beforeOptimization: results.baseline,
      afterOptimization: results.optimized,
      improvement: calculateImprovement(results.baseline, results.optimized),
    },

    connectionPool: {
      averageConnectionTime: results.connectionTime,
      poolUtilization: results.poolStats,
      memoryUsage: results.memoryImpact,
    },

    cache: {
      hitRate: results.cacheHitRate,
      averageHitTime: results.cacheHitTime,
      averageMissTime: results.cacheMissTime,
    },

    memoryProfile: {
      peakUsage: results.peakMemory,
      averageUsage: results.averageMemory,
      leakDetection: results.memoryLeaks,
    },
  };

  // CSVとJSONで出力
  fs.writeFileSync(
    `perf-results/optimization-report-${Date.now()}.json`,
    JSON.stringify(report, null, 2),
  );

  // コンソール表示
  console.table(report.summary);
  console.log("\n📊 詳細レポートを保存しました");
}
```

**🆕 `scripts/memory-stress-test.ts`**

```typescript
// メモリ制約下での負荷テスト
async function runMemoryStressTest() {
  const maxMemoryMB = 2048; // 2GB制限
  const targetLoad = 100; // 同時リクエスト数

  console.log(`🔥 メモリストレステスト開始 (制限: ${maxMemoryMB}MB)`);

  let currentRequests = 0;
  const results = [];

  while (currentRequests < targetLoad) {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;

    if (memUsageMB > maxMemoryMB * 0.9) {
      // 90%で停止
      console.log(`⚠️ メモリ制限に近づきました: ${memUsageMB.toFixed(2)}MB`);
      break;
    }

    // 負荷を段階的に増加
    currentRequests += 10;
    const batchResults = await runConcurrentRequests(10);
    results.push(...batchResults);

    await sleep(1000); // 1秒待機
  }

  generateStressTestReport(results, process.memoryUsage());
}
```

---

## 📊 全体の期待効果

### パフォーマンス改善目標

| 指標                       | 改善前 | 改善後    | 改善率  |
| -------------------------- | ------ | --------- | ------- |
| tools/list初回             | 2-3秒  | 500ms     | 80%短縮 |
| tools/listキャッシュヒット | N/A    | 50ms      | 新機能  |
| 同時リクエスト処理         | 10     | 50+       | 5倍向上 |
| メモリ使用量               | 不安定 | 800MB安定 | 安定化  |

### 段階的改善効果

- **PR #1-2**: 基盤構築（パフォーマンス改善なし）
- **PR #3-4**: 50%のパフォーマンス改善
- **PR #5-6**: 80%のパフォーマンス改善
- **PR #7**: 測定・監視・最適化完了

## ⚠️ 注意事項

### メモリ管理

- 各PRで必ずメモリリーク検証を実行
- 2GB制約を常に意識した実装
- 定期的なガベージコレクション監視

### 後方互換性

- 既存APIの動作は完全に維持
- 機能フラグによる段階的有効化
- ロールバック戦略の準備

### 監視・アラート

- メモリ使用量の継続監視
- パフォーマンス劣化の早期検知
- エラー率の監視強化

この実装計画により、2GBメモリ制約下で最大5倍のパフォーマンス向上を安全に実現できます。

## 📝 実装チェックリスト

### PR #1: MCPコネクションプール基盤実装

- [ ] `src/utils/mcpConnectionPool.ts` 作成
- [ ] `MCPConnectionPool` クラス実装
- [ ] `ServerConnectionPool` クラス実装
- [ ] `MCPConnection` クラス実装
- [ ] 単体テスト作成
- [ ] メモリリーク検証

### PR #2: Tools/listキャッシュ機構実装

- [ ] `src/utils/toolsCache.ts` 作成
- [ ] `ToolsCache` クラス実装
- [ ] キャッシュキー生成ロジック
- [ ] サーバー設定ハッシュ生成
- [ ] 単体テスト作成
- [ ] メモリ使用量測定

### PR #3: proxy.tsへの接続プール統合

- [ ] `src/utils/proxy.ts` 修正
- [ ] `getPooledConnections` 関数実装
- [ ] `returnConnectionsToPool` 関数実装
- [ ] エラーハンドリング改善
- [ ] パフォーマンステスト実行

### PR #4: tools/listキャッシュ統合

- [ ] `src/utils/proxy.ts` 修正
- [ ] キャッシュキー生成統合
- [ ] キャッシュヒット・ミス処理
- [ ] ログ記録にキャッシュ情報追加
- [ ] キャッシュ効果測定

### PR #5: CallToolへの接続プール適用

- [ ] `CallToolRequestSchema` ハンドラー修正
- [ ] `getConnectionForTool` 関数実装
- [ ] ツール実行時の接続管理
- [ ] パフォーマンス測定

### PR #6: DBログ最適化とクリーンアップ

- [ ] `src/utils/proxy.ts` 修正（tools/list詳細ログ除外）
- [ ] `src/utils/logCleanup.ts` 作成
- [ ] `src/index.ts` 修正（クリーンアップ開始）
- [ ] 30日保持ポリシー実装
- [ ] 定期クリーンアップジョブ実装
- [ ] 単体テスト作成

### PR #7: 設定最適化とモニタリング強化

- [ ] `src/libs/config.ts` 修正
- [ ] `src/utils/performanceMonitor.ts` 作成
- [ ] `src/routes/health/metrics.ts` 作成
- [ ] 監視機能実装
- [ ] アラート機能実装

### PR #8: パフォーマンステスト改善

- [ ] `scripts/perf-test.ts` 修正
- [ ] `scripts/memory-stress-test.ts` 作成
- [ ] 接続プール効果測定
- [ ] キャッシュ効果測定
- [ ] メモリプロファイリング
- [ ] 統合レポート生成

## 🔗 関連リソース

- [MCPプロトコル仕様](https://spec.modelcontextprotocol.io/)
- [Node.js パフォーマンス最適化ガイド](https://nodejs.org/en/docs/guides/simple-profiling/)
- [LRUキャッシュ実装参考](https://github.com/isaacs/node-lru-cache)
