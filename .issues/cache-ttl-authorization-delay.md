---
apps:
  - mcp-proxy
severity: medium
difficulty: medium
---

# キャッシュ有効期限による認可遅延

## 概要

設定キャッシュのTTL（5分）により、ユーザー削除や権限変更後も最大5分間アクセスが可能になる認可遅延の問題。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/libs/cache/configCache.ts`
- `apps/mcp-proxy/src/constants/config.ts`

## 詳細

### 現状

`config.ts:8-20` でキャッシュTTLが定義されている:

```typescript
export const CACHE_CONFIG = {
  DEFAULT_TTL_SECONDS: 300, // 5分
  KEY_PREFIX: {
    MCP_CONFIG: "mcp:config:",
  },
} as const;
```

`configCache.ts` のコメント（行19-26）に記載されている通り:

```typescript
/**
 * TODO: 将来的にRedisキャッシュを再実装する場合は、以下の点を考慮:
 * - Cloud Run のステートレス環境に適したキャッシュ戦略
 * - Redis接続の信頼性とフォールバック処理
 * - 暗号化/復号化のオーバーヘッド
 * - キャッシュ無効化のタイミングと整合性
 */
```

### 問題点

1. **認可変更の遅延**
   - ユーザーが組織から削除されても、キャッシュが有効な間はアクセス可能
   - 権限の降格（Admin → Member）も即座に反映されない

2. **セキュリティインシデント対応の遅延**
   - アカウント侵害時に即座にアクセスを遮断できない
   - APIキーの無効化も5分間反映されない可能性

3. **コメントアウトされたコード**
   - `configCache.ts` のRedisキャッシュ実装がコメントアウトされている
   - 本番環境ではキャッシュが無効（#012参照）だが、将来再有効化される可能性

### 影響

- **セキュリティ**: 権限変更が即座に反映されないことで、不正アクセスの時間窓が生まれる
- **コンプライアンス**: 監査要件でリアルタイムの権限管理が求められる場合に問題
- **ユーザー体験**: 権限変更後も古い権限で動作することで混乱を招く

## 推奨される対策

1. **イベント駆動のキャッシュ無効化**

```typescript
// managerアプリで権限変更時にPub/Subでキャッシュ無効化
await pubsub.publish("cache:invalidate", {
  type: "user_permission",
  userId: userId,
  organizationId: orgId,
});
```

2. **キャッシュTTLの短縮**

```typescript
export const CACHE_CONFIG = {
  DEFAULT_TTL_SECONDS: 60, // 1分に短縮
  // ...
} as const;
```

3. **ネガティブキャッシュの分離**
   - 認可に関するキャッシュは短いTTLを設定
   - 設定データのキャッシュは長いTTLを維持

4. **キャッシュバイパスオプション**

```typescript
// 重要な操作では強制的にDBから取得
const config = await getCachedConfig(serverId, fetchFromDb, {
  bypassCache: isSecuritySensitiveOperation,
});
```

5. **ユーザーステータスの追加チェック**
   - キャッシュヒット時も、ユーザーのアクティブステータスをDBで確認
   - 軽量なチェック（単一カラムの取得）で遅延を最小化

## 関連ファイル

- `apps/mcp-proxy/src/libs/cache/configCache.ts`
- `apps/mcp-proxy/src/constants/config.ts`
- `apps/mcp-proxy/src/libs/cache/redis.ts`
