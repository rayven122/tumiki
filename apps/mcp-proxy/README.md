# MCP Proxy

複数のリモートMCPサーバーを統合し、単一のエンドポイントで公開するプロキシサーバー。

## 概要

- **複数Remote MCP統合**: 名前空間ベースルーティング、接続プール管理
- **ステートレス設計**: Cloud Run対応、水平スケール可能
- **APIキー認証**: データベースベース検証、LRUキャッシング
- **構造化ログ**: Cloud Logging/BigQuery自動連携

## Phase 2 機能（実装済み）

- **高可用性**: Circuit Breaker, Retry with Exponential Backoff, Fallback戦略
- **レート制限**: 組織/APIキーごとのレート制限（Redis対応）
- **分散キャッシュ**: Redisベースの分散キャッシュ（LRUフォールバック）
- **可観測性**: OpenTelemetry統合、分散トレーシング、Prometheusメトリクス

## 技術スタック

- **Hono**: 軽量Webフレームワーク
- **@modelcontextprotocol/sdk**: MCPプロトコル実装
- **Zod**: スキーマ検証
- **@tumiki/db**: Prisma DBクライアント

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 型チェック
pnpm typecheck

# テスト
pnpm test           # 単体テスト
pnpm test:watch     # ウォッチモード
pnpm test:coverage  # カバレッジ

# サーバー起動（本番）
pnpm start
```

## エンドポイント

- `GET /health` - 基本ヘルスチェック
- `GET /health/detailed` - 詳細ヘルスチェック（接続プール統計）
- `POST /mcp` - MCPプロトコルハンドラー（認証必須）

## 環境変数

```bash
# サーバー設定
PORT=8080
NODE_ENV=production

# データベース
DATABASE_URL=postgresql://...

# 接続プール設定
MAX_IDLE_TIME=300000           # アイドルタイムアウト（5分）
CONNECTION_TIMEOUT=30000       # 接続タイムアウト（30秒）
HEALTH_CHECK_INTERVAL=60000    # ヘルスチェック間隔（1分）

# キャッシュ設定
CACHE_TTL=300                  # キャッシュTTL（5分）
CACHE_ENABLED=true

# Phase 2: Redis設定
REDIS_ENABLED=true             # Redis有効化
REDIS_HOST=localhost           # Redisホスト
REDIS_PORT=6379                # Redisポート
REDIS_PASSWORD=                # Redisパスワード（オプション）
REDIS_DB=0                     # Redis DB番号

# Phase 2: OpenTelemetry設定
OTEL_ENABLED=true              # OpenTelemetry有効化
OTEL_SERVICE_NAME=mcp-proxy-server  # サービス名
OTEL_SERVICE_VERSION=1.0.0     # サービスバージョン
OTEL_EXPORTER_OTLP_ENDPOINT=   # トレーシングエンドポイント（オプション）
OTEL_METRICS_PORT=9464         # Prometheusメトリクスポート
OTEL_ENABLE_TRACING=true       # トレーシング有効化
OTEL_ENABLE_METRICS=true       # メトリクス有効化

# ログ設定
LOG_LEVEL=info
```

## Remote MCPサーバーの追加

`src/config/mcpServers.ts` に設定を追加：

```typescript
{
  namespace: "github",              // 一意の名前空間
  name: "GitHub MCP Server",        // 表示名
  url: "https://mcp.example.com",   // エンドポイント
  authType: "bearer",               // none | bearer | api_key
  authToken: process.env.GITHUB_TOKEN,
  headers: {                        // 追加ヘッダー（オプション）
    "X-Custom-Header": "value",
  },
  enabled: true,                    // 有効/無効
}
```

## 認証

APIキー認証を使用：

```http
# X-API-Key ヘッダー
X-API-Key: tumiki_live_abc123...

# または Authorization: Bearer
Authorization: Bearer tumiki_live_abc123...
```

## デプロイ

Cloud Run向けに設計されています：

```bash
# ビルド
pnpm build

# デプロイ（Cloud Build）
gcloud builds submit
```

## アーキテクチャ

詳細な設計については `claudedocs/mcp-proxy-design.md` を参照してください。
