---
apps:
  - mcp-proxy
severity: medium
difficulty: medium
---

# Redisキャッシュの無効化

## 概要

本番環境でRedisキャッシュが無効化されており、すべてのリクエストでデータベースに直接アクセスしている。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/libs/cache/configCache.ts`
- `apps/mcp-proxy/src/libs/cache/redis.ts`

## 詳細

### 現状

`configCache.ts:28-36` で、キャッシュが明示的に無効化されている:

```typescript
export const getCachedConfig = async (
  mcpServerId: string,
  fetchFromDb: () => Promise<CachedConfigData>,
): Promise<CachedConfigData> => {
  logInfo("Fetching config from DB (cache disabled)", {
    mcpServerId,
  });
  return await fetchFromDb();
  // ... 100行以上のコメントアウトされたRedisキャッシュ実装
};
```

TODOコメント（行17-26）に理由が記載:

```typescript
/**
 * TODO: 将来的にRedisキャッシュを再実装する場合は、以下の点を考慮:
 * - Cloud Run のステートレス環境に適したキャッシュ戦略
 * - Redis接続の信頼性とフォールバック処理
 * - 暗号化/復号化のオーバーヘッド
 * - キャッシュ無効化のタイミングと整合性
 *
 * 現在: Redisキャッシュは本番環境では無効化されています
 */
```

### 問題点

1. **データベース負荷の増加**
   - すべてのMCPリクエストでデータベースクエリが発生
   - 同じ設定の繰り返し取得で不必要なDB負荷

2. **レイテンシの増加**
   - キャッシュヒット時と比較して応答時間が長い
   - 特に複数のMCPサーバー設定を取得する場合に顕著

3. **スケーラビリティの制限**
   - データベースがボトルネックになる可能性
   - 大量の同時リクエストでパフォーマンス低下

4. **コスト増加**
   - データベースへの読み取りリクエスト増加
   - Cloud SQLの使用量増加

5. **無効化の理由が不明確**
   - TODOコメントには考慮事項が記載されているが、具体的な問題は不明
   - いつキャッシュを再有効化するかの計画がない

### 影響

- **パフォーマンス**: 応答時間の増加
- **スケーラビリティ**: データベースがボトルネック
- **コスト**: 不必要なデータベース使用量

## 推奨される対策

1. **段階的なキャッシュ再有効化**

```typescript
// 環境変数でキャッシュを制御
const CACHE_ENABLED = process.env.ENABLE_CONFIG_CACHE === "true";
const CACHE_TTL = Number(process.env.CACHE_TTL_SECONDS) || 300;

export const getCachedConfig = async (
  mcpServerId: string,
  fetchFromDb: () => Promise<CachedConfigData>,
): Promise<CachedConfigData> => {
  // キャッシュが無効な場合はDBから直接取得
  if (!CACHE_ENABLED) {
    return await fetchFromDb();
  }

  // キャッシュロジック
  // ...
};
```

2. **インメモリキャッシュの検討**

```typescript
// Redisの代わりにインメモリキャッシュを使用
// Cloud Runのステートレス環境でも、単一リクエスト中やコンテナライフサイクル内で有効
import { LRUCache } from "lru-cache";

const configCache = new LRUCache<string, CachedConfigData>({
  max: 1000,
  ttl: 60000, // 1分
});

export const getCachedConfig = async (
  mcpServerId: string,
  fetchFromDb: () => Promise<CachedConfigData>,
): Promise<CachedConfigData> => {
  const cacheKey = `config:${mcpServerId}`;

  // キャッシュチェック
  const cached = configCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // DBから取得してキャッシュ
  const data = await fetchFromDb();
  configCache.set(cacheKey, data);

  return data;
};
```

3. **Redis接続の信頼性向上**

```typescript
// redis.ts
import { Redis } from "ioredis";

let redisClient: Redis | null = null;
let connectionFailed = false;

export const getRedisClient = async (): Promise<Redis | null> => {
  // 接続失敗フラグがある場合はnullを返す（サーキットブレーカー）
  if (connectionFailed) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(process.env.REDIS_URL!, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on("error", (error) => {
      logError("Redis connection error", error);
      connectionFailed = true;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logError("Failed to connect to Redis", error);
    connectionFailed = true;
    return null;
  }
};
```

4. **キャッシュ戦略のドキュメント化**

```markdown
# キャッシュ戦略

## 現状

- Redisキャッシュは無効化
- すべてのリクエストでDBアクセス

## 計画

1. Phase 1: インメモリキャッシュの導入（LRUCache）
2. Phase 2: Redis接続の安定化
3. Phase 3: 段階的なRedisキャッシュ有効化

## 設計上の考慮事項

- Cloud Runのステートレス環境
- キャッシュ無効化のタイミング
- 暗号化の必要性
```

5. **パフォーマンスモニタリング**

```typescript
// キャッシュの効果を測定
const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  avgDbQueryTimeMs: 0,
};

export const getCachedConfig = async (/* ... */) => {
  const startTime = Date.now();

  // ...

  const duration = Date.now() - startTime;
  metrics.avgDbQueryTimeMs = (metrics.avgDbQueryTimeMs + duration) / 2;

  // 定期的にメトリクスをログ
};
```

## 関連ファイル

- `apps/mcp-proxy/src/libs/cache/configCache.ts`
- `apps/mcp-proxy/src/libs/cache/redis.ts`
- `apps/mcp-proxy/src/constants/config.ts`
