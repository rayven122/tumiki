# ProxyServer接続遅延改善計画

## 概要

ProxyServerのMCP接続で1秒以上の遅延が発生している問題の分析と改善案をまとめたドキュメントです。

## 現状の問題

### 測定結果

- **Query Parameter Auth**: 1,483ms
- **Instance ID Auth**: 1,193ms

### 遅延の発生箇所

1. 新規MCP接続の確立
2. データベースアクセス
3. MCPクライアント接続処理
4. 初回tools/list呼び出し

## ボトルネック分析

### 1. データベースアクセス (300-500ms)

**発生箇所**: `proxy.ts:323-428` の `getServerConfigsByInstanceId()`

**問題点**:

- `userMcpServerInstance.findUnique()` with include
- `userMcpServerConfig.findMany()`
- JSON環境変数の解析処理

**改善対象**:

```typescript
// 複数のDBクエリが順次実行
const serverInstance = await db.userMcpServerInstance.findUnique({
  include: {
    toolGroup: {
      include: {
        toolGroupTools: {
          include: { tool: true }
        }
      }
    }
  }
});

const serverConfigs = await db.userMcpServerConfig.findMany(...);
```

### 2. MCPサーバー接続確立 (400-600ms)

**発生箇所**: `proxy.ts:432-488` の `getMcpClientsByInstanceId()`

**問題点**:

- 新規接続時のハンドシェイク処理
- StdioまたはSSEトランスポートの初期化
- MCP接続プールでの接続確立

**改善対象**:

```typescript
// 各MCPサーバーへの新規接続
const connectionPromises = serverConfigs.map(async (serverConfig) => {
  const client = await mcpPool.getConnection(
    userMcpServerInstanceId,
    serverConfig.name,
    serverConfig,
  );
});
```

### 3. 初回tools/list呼び出し (200-300ms)

**発生箇所**: `proxy.ts:569-774` の tools/list handler

**問題点**:

- 各MCPサーバーからのツール一覧取得
- キャッシュミス時の並列リクエスト処理

## 改善案

### 🚀 優先度：高 - ServerConfigキャッシュの実装

**概要**: データベースアクセスをメモリキャッシュで高速化

**実装場所**: `apps/proxyServer/src/utils/cache/serverConfigCache.ts`

```typescript
import { ExpireMap } from "../expireMap.js";
import type { ServerConfig } from "../../libs/types.js";

export class ServerConfigCache {
  private cache = new ExpireMap<string, ServerConfig[]>(
    15 * 60 * 1000, // 15分TTL
  );

  async getOrFetch(
    instanceId: string,
    fetcher: () => Promise<ServerConfig[]>,
  ): Promise<ServerConfig[]> {
    const cached = this.cache.get(instanceId);
    if (cached) {
      return cached;
    }

    const configs = await fetcher();
    this.cache.set(instanceId, configs);
    return configs;
  }

  invalidate(instanceId: string): boolean {
    return this.cache.delete(instanceId);
  }

  clear(): void {
    this.cache.clear();
  }
}

// シングルトンインスタンス
export const serverConfigCache = new ServerConfigCache();
```

**proxy.tsでの使用**:

```typescript
import { serverConfigCache } from "./cache/serverConfigCache.js";

const getServerConfigsByInstanceId = async (
  userMcpServerInstanceId: string,
) => {
  return serverConfigCache.getOrFetch(
    userMcpServerInstanceId,
    async () => {
      // 既存のDB取得ロジック
      const serverInstance = await db.userMcpServerInstance.findUnique(...);
      // ... 省略
      return serverConfigList;
    }
  );
};
```

**期待効果**: 200-400ms削減

### 🚀 優先度：高 - プリコネクション機能

**概要**: 人気のMCPサーバーに事前接続してウォームアップ

**実装場所**: `apps/proxyServer/src/utils/preconnect.ts`

```typescript
import { mcpPool } from "./mcpPool.js";
import { getServerConfigsByInstanceId } from "./proxy.js";
import { db } from "@tumiki/db/tcp";

export class PreconnectManager {
  private popularInstances: Set<string> = new Set();
  private warmupInterval: NodeJS.Timeout | null = null;

  /**
   * 単一インスタンスの接続をウォームアップ
   */
  async warmupConnection(instanceId: string): Promise<void> {
    try {
      const configs = await getServerConfigsByInstanceId(instanceId);

      // バックグラウンドで接続を確立
      const warmupPromises = configs.map(async (config) => {
        try {
          await mcpPool.preconnect(instanceId, config.name, config);
        } catch (error) {
          console.warn(`Failed to preconnect ${config.name}:`, error);
        }
      });

      await Promise.allSettled(warmupPromises);
      this.popularInstances.add(instanceId);
    } catch (error) {
      console.error(`Failed to warmup instance ${instanceId}:`, error);
    }
  }

  /**
   * 人気のMCPサーバーを事前接続
   */
  async warmupPopularConnections(): Promise<void> {
    try {
      const popularInstances = await db.userMcpServerInstance.findMany({
        where: {
          deletedAt: null,
          lastUsedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24時間以内
          },
        },
        orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }],
        take: 10,
        select: { id: true },
      });

      // 並列でウォームアップ実行
      const warmupPromises = popularInstances.map((instance) =>
        this.warmupConnection(instance.id),
      );

      await Promise.allSettled(warmupPromises);

      console.log(`Warmed up ${popularInstances.length} popular instances`);
    } catch (error) {
      console.error("Failed to warmup popular connections:", error);
    }
  }

  /**
   * 定期的な接続維持
   */
  async maintainConnections(): Promise<void> {
    for (const instanceId of this.popularInstances) {
      try {
        // ヘルスチェック実行
        await mcpPool.healthCheck(instanceId);
      } catch (error) {
        console.warn(`Health check failed for ${instanceId}:`, error);
        // 失敗した接続は再ウォームアップ
        await this.warmupConnection(instanceId);
      }
    }
  }

  /**
   * 定期的なウォームアップを開始
   */
  startPeriodicWarmup(): void {
    // 5分ごとに接続維持
    this.warmupInterval = setInterval(
      () => {
        this.maintainConnections();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * 定期処理を停止
   */
  stopPeriodicWarmup(): void {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = null;
    }
  }
}

// シングルトンインスタンス
export const preconnectManager = new PreconnectManager();
```

**index.tsでの使用**:

```typescript
import { preconnectManager } from "./utils/preconnect.js";

app.listen(PORT, async () => {
  console.log(`🚀 ProxyServer running on port ${PORT}`);

  // 起動時に人気のMCPサーバーに事前接続
  await preconnectManager.warmupPopularConnections();

  // 定期的な接続維持を開始
  preconnectManager.startPeriodicWarmup();
});

// プロセス終了時のクリーンアップ
process.on("SIGTERM", () => {
  preconnectManager.stopPeriodicWarmup();
});
```

**期待効果**: 500-800ms削減

### ⚡ 優先度：中 - DBクエリ最適化

**概要**: 複数のDBクエリを1つに統合し、不要なフィールドを除外

**実装場所**: `proxy.ts` の `getServerConfigsByInstanceId()`

```typescript
// 最適化前（複数クエリ）
const serverInstance = await db.userMcpServerInstance.findUnique({
  where: { id: userMcpServerInstanceId, deletedAt: null },
  include: {
    toolGroup: {
      include: {
        toolGroupTools: {
          include: { tool: true },
        },
      },
    },
  },
});

const serverConfigs = await db.userMcpServerConfig.findMany({
  where: { id: { in: serverConfigIds } },
  omit: { envVars: false },
  include: { mcpServer: true },
});

// 最適化後（1クエリ）
const optimizedQuery = await db.$queryRaw<OptimizedResult[]>`
  SELECT
    si.id as instance_id,
    si.organization_id,
    sc.id as config_id,
    sc.name as config_name,
    sc.env_vars,
    ms.command,
    ms.args,
    array_agg(t.name) as tool_names
  FROM user_mcp_server_instance si
  JOIN tool_group tg ON si.tool_group_id = tg.id
  JOIN tool_group_tool tgt ON tg.id = tgt.tool_group_id
  JOIN user_mcp_server_config sc ON tgt.user_mcp_server_config_id = sc.id
  JOIN mcp_server ms ON sc.mcp_server_id = ms.id
  JOIN tool t ON tgt.tool_id = t.id
  WHERE si.id = ${userMcpServerInstanceId}
    AND si.deleted_at IS NULL
  GROUP BY si.id, si.organization_id, sc.id, sc.name, sc.env_vars, ms.command, ms.args
`;
```

**期待効果**: 100-200ms削減

### 🔧 優先度：中 - MCPプールの事前初期化

**概要**: よく使われるMCPサーバーの接続を事前に確立

**mcpPool.tsでの拡張**:

```typescript
export class MCPPool {
  // 既存のコード...

  /**
   * 事前接続機能
   */
  async preconnect(
    instanceId: string,
    serverName: string,
    serverConfig: ServerConfig,
  ): Promise<void> {
    const key = `${instanceId}:${serverName}`;

    // 既に接続がある場合はスキップ
    if (this.activeConnections.has(key)) {
      return;
    }

    try {
      const client = await connectToServer(serverConfig);
      if (client) {
        this.activeConnections.set(key, {
          client: client.client,
          lastUsed: Date.now(),
          cleanup: client.cleanup,
        });

        // アイドルタイムアウトを設定
        this.setupIdleTimeout(key);
      }
    } catch (error) {
      console.warn(`Failed to preconnect ${serverName}:`, error);
    }
  }

  /**
   * ヘルスチェック機能
   */
  async healthCheck(instanceId: string): Promise<boolean> {
    const connections = Array.from(this.activeConnections.entries()).filter(
      ([key]) => key.startsWith(`${instanceId}:`),
    );

    let healthyCount = 0;

    for (const [key, connection] of connections) {
      try {
        // 簡単なツール一覧取得でヘルスチェック
        await connection.client.request(
          { method: "tools/list", params: {} },
          ListToolsResultSchema,
        );

        healthyCount++;
      } catch (error) {
        console.warn(`Health check failed for ${key}:`, error);
        // 不健全な接続を削除
        await this.removeConnection(key);
      }
    }

    return healthyCount > 0;
  }
}
```

## 実装スケジュール

### Phase 1: 即効性のある改善 (1-2日)

1. **ServerConfigキャッシュ実装**
   - `serverConfigCache.ts` 作成
   - `proxy.ts` でキャッシュ使用

2. **DBクエリ最適化**
   - 複数クエリを1つに統合
   - 不要フィールドの除外

### Phase 2: プリコネクション機能 (2-3日)

1. **PreconnectManager実装**
   - `preconnect.ts` 作成
   - MCPプールとの連携

2. **サーバー起動時の事前接続**
   - `index.ts` での初期化
   - 定期的な接続維持

### Phase 3: 高度な最適化 (3-5日)

1. **MCPプールの拡張**
   - 事前接続機能
   - ヘルスチェック機能

2. **パフォーマンス測定**
   - 改善効果の検証
   - モニタリング強化

## 期待される改善効果

### 現状

- **初回接続**: 1,000-1,500ms
- **2回目以降**: 800-1,200ms（一部キャッシュ効果）

### 改善後

- **初回接続**: 300-500ms (60-70%削減)
- **2回目以降**: 100-200ms (80-90%削減)

### 改善内訳

- **ServerConfigキャッシュ**: -300ms
- **プリコネクション**: -600ms
- **DBクエリ最適化**: -150ms
- **その他の最適化**: -100ms

## モニタリング指標

### 追加すべきメトリクス

1. **接続時間の分布**
   - P50, P90, P99パーセンタイル
   - 初回 vs 2回目以降

2. **キャッシュヒット率**
   - ServerConfigキャッシュ
   - ToolsCache
   - AuthCache

3. **プリコネクション効果**
   - 事前接続成功率
   - ウォームアップ対象インスタンス数

### ログ出力例

```typescript
// パフォーマンスログ
console.log({
  type: "connection_performance",
  instanceId,
  duration: endTime - startTime,
  cacheHit: {
    serverConfig: serverConfigCached,
    tools: toolsCached,
    auth: authCached,
  },
  preconnected: wasPreconnected,
});
```

## リスク評価

### 低リスク

- **ServerConfigキャッシュ**: 既存パターンと同様
- **DBクエリ最適化**: 読み取り専用の改善

### 中リスク

- **プリコネクション**: 新機能、リソース使用量増加
- **MCPプール拡張**: 既存の接続管理への影響

### 対策

1. **段階的実装**: Phase分けで安全にリリース
2. **フィーチャーフラグ**: 新機能のON/OFF切り替え
3. **ロールバック計画**: 各Phase毎の戻し手順

## まとめ

この改善計画により、ProxyServerの接続遅延を大幅に削減し、ユーザー体験を向上させることができます。特にServerConfigキャッシュとプリコネクション機能は即効性が高く、優先的に実装すべき機能です。

実装は段階的に行い、各Phase毎にパフォーマンス測定と検証を実施することで、安全かつ効果的な改善を実現します。
