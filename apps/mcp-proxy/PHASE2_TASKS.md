# Phase 2: Keycloak JWT認証の最適化と拡張

## 概要

Phase 1で基本的なJWT認証機能を実装しました。Phase 2では、本番環境での運用を見据えた最適化とセキュリティ機能の拡張を実施します。

## 完了したタスク（Phase 1）

- ✅ Keycloak JWT認証ミドルウェアの実装
- ✅ 統合認証ミドルウェアの実装
- ✅ 開発モード対応（DEV_MODE=true）
- ✅ 基本テストの作成（49テスト、100%成功）
- ✅ 品質チェック全通過（format, lint, typecheck, build）
- ✅ 動作検証完了（実サーバーでの確認）

## Phase 2 タスクリスト

### 1. Redis JWKSキャッシュの実装 🔄

**優先度**: High
**工数**: 中（2-3時間）

#### タスク

- [ ] `src/libs/cache/jwksCache.ts` を作成
  - [ ] Redis クライアントの初期化
  - [ ] JWKS キャッシュの取得・保存関数
  - [ ] キャッシュのTTL設定（デフォルト: 3600秒）
  - [ ] キャッシュミスハンドリング
- [ ] `src/middleware/auth/jwt.ts` にキャッシュ統合
  - [ ] JWKS取得前にRedisをチェック
  - [ ] キャッシュヒット時の処理
  - [ ] キャッシュミス時にKeycloakから取得してRedisに保存
- [ ] テストの作成
  - [ ] `src/libs/cache/__tests__/jwksCache.test.ts`
  - [ ] キャッシュヒット/ミスのテスト
  - [ ] TTL期限切れのテスト
  - [ ] Redis接続エラーのハンドリングテスト

#### 実装詳細

```typescript
// src/libs/cache/jwksCache.ts
export interface JWKSCacheOptions {
  ttl?: number; // デフォルト: 3600秒（1時間）
  keyPrefix?: string; // デフォルト: "jwks:"
}

export async function getJWKSFromCache(issuer: string): Promise<JWKS | null>;
export async function setJWKSToCache(issuer: string, jwks: JWKS): Promise<void>;
export async function invalidateJWKSCache(issuer: string): Promise<void>;
```

#### 期待される効果

- JWKS取得のレイテンシー削減（Keycloak APIコール削減）
- Cloud Runのコールドスタート時のパフォーマンス改善
- Keycloakへの負荷軽減

---

### 2. スコープ検証ミドルウェアの実装 🔐

**優先度**: High
**工数**: 中（2-3時間）

#### タスク

- [ ] `src/middleware/scopeValidator.ts` を作成
  - [ ] スコープパースロジック（スペース区切り → 配列）
  - [ ] スコープ検証関数
  - [ ] 必要スコープの定義（例: `mcp:access:*`, `mcp:access:notion`）
- [ ] `src/middleware/auth.ts` にスコープ検証を統合
  - [ ] JWT認証後にスコープを検証
  - [ ] スコープ不足時のエラーレスポンス
- [ ] 型定義の追加
  - [ ] `src/types/index.ts` に `Scope` 型を追加
- [ ] テストの作成
  - [ ] `src/middleware/__tests__/scopeValidator.test.ts`
  - [ ] ワイルドカードスコープ（`mcp:access:*`）のテスト
  - [ ] 特定スコープ（`mcp:access:notion`）のテスト
  - [ ] スコープ不足エラーのテスト

#### 実装詳細

```typescript
// src/middleware/scopeValidator.ts
export type Scope = string; // "mcp:access:*" | "mcp:access:notion" など

export function parseScopes(scopeString: string): Scope[];
export function validateScope(
  userScopes: Scope[],
  requiredScope: Scope,
): boolean;
export function createScopeValidatorMiddleware(
  requiredScope: Scope,
): MiddlewareHandler;
```

#### スコープ形式

- `mcp:access:*` - すべてのMCPサーバーへのアクセス
- `mcp:access:{server_name}` - 特定のMCPサーバーへのアクセス（例: `mcp:access:notion`）
- `mcp:admin` - 管理者権限

---

### 3. エラーハンドリングとログの拡張 📊

**優先度**: Medium
**工数**: 小（1-2時間）

#### タスク

- [ ] エラーレスポンスの標準化
  - [ ] JSON-RPC 2.0エラーコードの整理
  - [ ] エラーメッセージの多言語対応（日本語/英語）
- [ ] ログレベルの追加
  - [ ] `logDebug` の追加（JWT検証の詳細ログ）
  - [ ] `logWarn` の追加（認証失敗の警告）
- [ ] 構造化ログの強化
  - [ ] JWT認証のメタデータ（issuer, sub, expなど）
  - [ ] APIキー認証のメタデータ（apiKeyId, organizationIdなど）
- [ ] エラートラッキング
  - [ ] 認証失敗の統計情報
  - [ ] Sentryなどのエラートラッキングサービス統合（オプション）

#### 実装詳細

```typescript
// src/libs/logger/index.ts に追加
export function logDebug(message: string, metadata?: object): void;
export function logWarn(message: string, metadata?: object): void;

// エラーコードの標準化
export const AUTH_ERROR_CODES = {
  NO_AUTH: -32600,
  INVALID_JWT: -32601,
  EXPIRED_JWT: -32602,
  INVALID_API_KEY: -32603,
  INSUFFICIENT_SCOPE: -32604,
} as const;
```

---

### 4. 統合テストの作成 🧪

**優先度**: High
**工数**: 中（2-3時間）

#### タスク

- [ ] `src/__tests__/integration/auth.integration.test.ts` を作成
  - [ ] 実際のKeycloak JWTトークンでのテスト（モックなし）
  - [ ] 複数の認証フローのエンドツーエンドテスト
  - [ ] Redis キャッシュの統合テスト
  - [ ] スコープ検証の統合テスト
- [ ] テスト環境の構築
  - [ ] Keycloak テストインスタンスのセットアップ（Docker Compose）
  - [ ] Redis テストインスタンスのセットアップ
  - [ ] テスト用のJWTトークン生成スクリプト
- [ ] CI/CDパイプラインへの統合
  - [ ] GitHub Actions での統合テスト実行
  - [ ] テストカバレッジの測定

#### テストシナリオ

1. **JWT認証フロー**
   - 有効なJWTトークンで認証成功
   - 有効期限切れJWTトークンで認証失敗
   - 不正な署名のJWTトークンで認証失敗
   - スコープ不足で認証失敗

2. **APIキー認証フロー**
   - 有効なAPIキーで認証成功
   - 無効なAPIキーで認証失敗
   - 非アクティブなAPIキーで認証失敗

3. **キャッシュフロー**
   - JWKSキャッシュヒットの確認
   - JWKSキャッシュミスからの復旧
   - キャッシュ期限切れ後の再取得

---

### 5. README.md の更新（OAuth認証ガイド） 📚

**優先度**: Medium
**工数**: 小（1時間）

#### タスク

- [ ] `apps/mcp-proxy/README.md` を更新
  - [ ] OAuth 2.0 JWT認証の概要
  - [ ] 認証フローの図解（Mermaid）
  - [ ] 環境変数の設定方法
  - [ ] 開発モードの使用方法
  - [ ] トラブルシューティング
- [ ] APIドキュメントの追加
  - [ ] 認証ヘッダーの形式
  - [ ] エラーレスポンスの一覧
  - [ ] スコープの説明
- [ ] サンプルコードの追加
  - [ ] cURLでのリクエスト例
  - [ ] Node.jsクライアントの実装例
  - [ ] Pythonクライアントの実装例

#### ドキュメント構成

```markdown
# MCP Proxy - OAuth 2.0 JWT 認証

## 概要

## 認証フロー

## セットアップ

### 環境変数

### Keycloak設定

## 使用方法

### JWT認証

### APIキー認証

## 開発モード

## スコープ

## エラーハンドリング

## トラブルシューティング

## サンプルコード
```

---

## 追加検討事項（Phase 3）

### セキュリティ強化

- [ ] Rate Limiting の実装
  - [ ] JWT認証の試行回数制限
  - [ ] APIキー認証の試行回数制限
- [ ] JWT Revocation の実装
  - [ ] トークン無効化リストの管理
  - [ ] Redisでのブラックリスト管理

### パフォーマンス最適化

- [ ] JWKSの並列取得
- [ ] バッチ認証処理
- [ ] Connection Pooling の最適化

### 監視・運用

- [ ] Prometheus メトリクスの追加
  - [ ] 認証成功/失敗のカウンター
  - [ ] JWT検証時間のヒストグラム
  - [ ] キャッシュヒット率
- [ ] Grafana ダッシュボードの作成

---

## テスト目標

| 項目                     | Phase 1 | Phase 2 目標 |
| ------------------------ | ------- | ------------ |
| ユニットテストカバレッジ | 100%    | 100%         |
| 統合テスト               | 0件     | 10件以上     |
| テスト総数               | 49件    | 80件以上     |

---

## 実装順序の推奨

1. **Redis JWKSキャッシュ** - パフォーマンス向上のため最優先
2. **スコープ検証** - セキュリティ強化のため高優先
3. **統合テスト** - 全体的な品質保証
4. **エラーハンドリング拡張** - 運用性向上
5. **ドキュメント更新** - 利用者への情報提供

---

## 完了条件

Phase 2 は以下の条件を満たした時点で完了とします：

- ✅ すべてのタスクが完了している
- ✅ テストカバレッジが100%を維持している
- ✅ 統合テストが10件以上追加されている
- ✅ CI/CDパイプラインで全テストが成功している
- ✅ README.md が更新されている
- ✅ コードレビューが完了している
- ✅ パフォーマンステストで性能改善が確認されている

---

## 参考資料

- [Keycloak Documentation](https://www.keycloak.org/docs/latest/)
- [OAuth 2.0 Specifications](https://oauth.net/2/)
- [JSON Web Key (JWK) RFC 7517](https://tools.ietf.org/html/rfc7517)
- [Hono Middleware Documentation](https://hono.dev/docs/guides/middleware)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
