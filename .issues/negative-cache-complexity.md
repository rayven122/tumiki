---
apps:
  - mcp-proxy
severity: low
difficulty: medium
---

# ネガティブキャッシュの複雑さ

## 概要

環境変数によるキャッシュ制御と、コメントアウトされたRedisキャッシュ実装が混在し、予測不可能な動作を引き起こす可能性。

## 重大度

低

## 影響範囲

- `apps/mcp-proxy/src/libs/cache/configCache.ts`
- `apps/mcp-proxy/src/libs/cache/redis.ts`

## 詳細

### 現状

`configCache.ts:28-36` で、キャッシュが現在無効化されている:

```typescript
export const getCachedConfig = async (
  mcpServerId: string,
  fetchFromDb: () => Promise<CachedConfigData>,
): Promise<CachedConfigData> => {
  logInfo("Fetching config from DB (cache disabled)", {
    mcpServerId,
  });
  return await fetchFromDb();
  // ... 大量のコメントアウトされたコード
```

コメントアウトされた実装（行39-121）には複雑なロジックが含まれる:

- Redis接続の取得とフォールバック
- 暗号化/復号化処理
- エラーハンドリング

### 問題点

1. **コードの複雑性**
   - 120行以上のコメントアウトされたコードが存在
   - 将来の再有効化時に古いコードをそのまま使用するリスク

2. **環境変数による制御の欠如**
   - キャッシュの有効/無効を環境変数で制御する仕組みがない
   - 現在はハードコードで無効化されている

3. **ネガティブキャッシュの未実装**
   - 存在しないリソースの検索結果をキャッシュする仕組みがない
   - 攻撃者が存在しないIDで繰り返しリクエストを送信できる

4. **キャッシュ無効化関数の空実装**
   - `invalidateConfigCache` 関数（行151-176）も実質的に何もしない

```typescript
export const invalidateConfigCache = async (
  mcpServerId: string,
): Promise<void> => {
  logInfo("Cache invalidation skipped (cache disabled)", {
    mcpServerId,
  });
  // ... コメントアウトされたコード
};
```

### 影響

- **パフォーマンス**: キャッシュが無効なため、毎回DBにアクセス
- **保守性**: コメントアウトされた大量のコードが保守を困難にする
- **一貫性**: キャッシュの動作が環境によって異なる可能性

## 推奨される対策

1. **フィーチャーフラグの導入**

```typescript
const CACHE_ENABLED = process.env.ENABLE_CONFIG_CACHE === "true";

export const getCachedConfig = async (
  mcpServerId: string,
  fetchFromDb: () => Promise<CachedConfigData>,
): Promise<CachedConfigData> => {
  if (!CACHE_ENABLED) {
    return await fetchFromDb();
  }
  // キャッシュロジック
};
```

2. **コメントアウトコードの整理**
   - コメントアウトされたコードを削除
   - 必要に応じてGitの履歴から復元可能
   - または、別ブランチに保存

3. **ネガティブキャッシュの実装**

```typescript
const NEGATIVE_CACHE_TTL = 60; // 1分

// 存在しないリソースもキャッシュ
if (!result) {
  await redis.setEx(cacheKey, NEGATIVE_CACHE_TTL, "__NOT_FOUND__");
}
```

4. **キャッシュ戦略のドキュメント化**
   - 現在の状態と将来の計画を明確にドキュメント化
   - 環境ごとの設定方法を記載

## 関連ファイル

- `apps/mcp-proxy/src/libs/cache/configCache.ts`
- `apps/mcp-proxy/src/libs/cache/redis.ts`
- `apps/mcp-proxy/src/constants/config.ts`
