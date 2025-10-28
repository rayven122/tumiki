# MCP Proxy

複数のリモートMCPサーバーを統合し、単一のエンドポイントで公開するプロキシサーバー。

## 概要

- **複数Remote MCP統合**: 名前空間ベースルーティング、マルチトランスポート対応
- **ステートレス設計**: Cloud Run対応、水平スケール可能
- **マルチトランスポート**: SSE/HTTP/Stdioクライアント対応
- **APIキー認証**: データベースベース検証
- **構造化ログ**: Cloud Logging/BigQuery自動連携

## アーキテクチャ特性

- **完全ステートレス**: 接続プールなし、リクエストごとに接続を作成・破棄
- **キャッシュレス**: インメモリキャッシュなし、シンプルで予測可能な動作
- **Cloud Run最適化**: スケールtoゼロ、水平スケール、マルチインスタンス対応

## インフラストラクチャ機能

- **レート制限**: Cloud Armor（Load Balancer経由）またはAPI Gatewayにて実施
- **可観測性**: Cloud LoggingおよびCloud Traceにて実施

## 技術スタック

- **Hono**: 軽量Webフレームワーク（50KB）
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

### ヘルスチェック

- `GET /health` - ヘルスチェック

### MCP Streamable HTTP Transport

- `POST /mcp/:userMcpServerInstanceId` - MCPプロトコルハンドラー（RESTful形式、認証必須）
  - `tools/list` - 利用可能なツールのリスト取得
  - `tools/call` - ツールの実行
- `POST /mcp` - MCPプロトコルハンドラー（レガシー形式、認証必須）

> **注意**: このプロキシサーバーはリモートMCPサーバーへの接続にSSE/HTTP/Stdioクライアントを使用します。
> クライアント向けのインターフェースはHTTP Transport（`POST /mcp`）のみです。
> SSEクライアント機能の詳細は `claudedocs/mcp-proxy-sse-client.md` を参照してください。

## 環境変数

```bash
# サーバー設定
PORT=8080
NODE_ENV=production

# データベース
DATABASE_URL=postgresql://...

# Redis（セッション管理）
REDIS_URL=redis://localhost:6379  # ローカル開発時
# REDIS_URL=redis://10.0.0.3:6379  # GCP Memorystore（内部IP）

# セッション設定
CONNECTION_TIMEOUT_MS=60000  # セッションタイムアウト（デフォルト: 60秒）
MAX_SESSIONS=200             # 最大セッション数（デフォルト: 200）

# ログ設定
LOG_LEVEL=info  # info, warn, error, debug
```

## Remote MCPサーバーの追加

### Named Servers形式

[sparfenyuk/mcp-proxy](https://github.com/sparfenyuk/mcp-proxy)の標準MCP設定形式を採用しています。

`src/config/mcpServers.ts` に設定を追加：

```typescript
export const REMOTE_MCP_SERVERS_CONFIG: RemoteMcpServersConfig = {
  mcpServers: {
    github: {
      // 名前空間（オブジェクトのキー）
      enabled: true, // 有効/無効フラグ
      name: "GitHub MCP Server", // 表示名
      url: "https://mcp.example.com/sse", // エンドポイントURL
      transportType: "sse", // sse（デフォルト） | http | stdio
      authType: "bearer", // none | bearer | api_key
      authToken: process.env.GITHUB_TOKEN,
      headers: {
        // 追加ヘッダー（オプション）
        "X-Custom-Header": "value",
      },
    },
    slack: {
      enabled: false, // 無効化する場合
      name: "Slack MCP Server",
      url: "https://slack-mcp.example.com/sse",
      transportType: "sse",
      authType: "bearer",
      authToken: process.env.SLACK_TOKEN,
      headers: {},
    },
    "local-server": {
      enabled: true,
      name: "Local MCP Server",
      url: "npx -y @modelcontextprotocol/server-everything", // Stdioの場合はコマンド
      transportType: "stdio", // ローカルプロセス起動
      authType: "none",
      headers: {},
    },
  },
};
```

### トランスポートタイプ

`transportType`でリモートMCPサーバーへの接続方法を選択できます：

#### SSE Transport（デフォルト）

Server-Sent Eventsを使用したリモートMCPサーバーへの接続：

```typescript
{
  "github": {
    "enabled": true,
    "name": "GitHub MCP Server",
    "url": "https://github-mcp.example.com/sse",
    "transportType": "sse",
    "authType": "bearer",
    "authToken": "${GITHUB_TOKEN}"
  }
}
```

#### HTTP Transport

標準的なHTTP/HTTPS接続（現在はSSEClientTransportを使用）：

```typescript
{
  "custom": {
    "enabled": true,
    "name": "Custom MCP Server",
    "url": "https://custom-mcp.example.com/mcp",
    "transportType": "http",
    "authType": "api_key",
    "authToken": "${API_KEY}"
  }
}
```

> **注意**: MCP SDKに`HTTPClientTransport`が追加された場合、自動的に対応します。

#### Stdio Transport

ローカルプロセスとして起動するMCPサーバー（`url`にコマンドを指定）：

```typescript
{
  "local-server": {
    "enabled": true,
    "name": "Local MCP Server",
    "url": "npx -y @modelcontextprotocol/server-everything",
    "transportType": "stdio",
    "authType": "none"
  }
}
```

### ツール名の形式

プロキシは名前空間付きのツール名を使用します：

```text
github.create_issue
slack.send_message
postgres.execute_query
```

各ツールは `{namespace}.{originalToolName}` の形式でアクセスできます。

### 設定例

`config.example.json` に実例があります。環境変数を使用して認証トークンを設定してください：

```bash
export GITHUB_TOKEN=your_token_here
export SLACK_TOKEN=your_token_here
```

## 使用例

### ツールリストの取得

```bash
curl -X POST http://localhost:8080/mcp \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

レスポンス例：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "github.create_issue",
        "description": "Create a new GitHub issue",
        "inputSchema": { ... }
      },
      {
        "name": "slack.send_message",
        "description": "Send a message to Slack",
        "inputSchema": { ... }
      }
    ]
  }
}
```

### ツールの実行

```bash
curl -X POST http://localhost:8080/mcp \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "github.create_issue",
      "arguments": {
        "repo": "owner/repo",
        "title": "Test issue",
        "body": "This is a test issue"
      }
    }
  }'
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

### GCP Memorystore for Redis のセットアップ

Cloud Run からセッション管理に Redis を使用するには、以下の設定が必要です：

#### 1. Memorystore インスタンスの作成

```bash
# Basic tier（開発・テスト用）
gcloud redis instances create mcp-proxy-sessions \
  --size=1 \
  --region=asia-northeast1 \
  --redis-version=redis_7_0 \
  --tier=BASIC

# Standard tier（本番用、高可用性）
gcloud redis instances create mcp-proxy-sessions \
  --size=2 \
  --region=asia-northeast1 \
  --redis-version=redis_7_0 \
  --tier=STANDARD_HA
```

#### 2. Serverless VPC Access の設定

Cloud Run から Memorystore に接続するには VPC コネクタが必要です：

```bash
# VPC コネクタの作成
gcloud compute networks vpc-access connectors create mcp-proxy-connector \
  --region=asia-northeast1 \
  --network=default \
  --range=10.8.0.0/28
```

#### 3. Cloud Run への環境変数設定

```bash
# Memorystore の内部 IP を取得
REDIS_HOST=$(gcloud redis instances describe mcp-proxy-sessions \
  --region=asia-northeast1 \
  --format="value(host)")

# Cloud Run に環境変数を設定
gcloud run services update mcp-proxy \
  --region=asia-northeast1 \
  --set-env-vars="REDIS_URL=redis://${REDIS_HOST}:6379" \
  --vpc-connector=mcp-proxy-connector \
  --vpc-egress=private-ranges-only
```

#### 4. ローカル開発時の設定

ローカル開発では、Docker で Redis を起動：

```bash
# Docker Compose で Redis を起動
docker run -d -p 6379:6379 redis:7-alpine

# 環境変数を設定
export REDIS_URL=redis://localhost:6379
```

## アーキテクチャ

詳細な設計については以下のドキュメントを参照してください：

- **設計概要**: `claudedocs/mcp-proxy-design.md`
- **SSEクライアント機能**: `claudedocs/mcp-proxy-sse-client.md`
- **トランスポート実装状況**: `claudedocs/mcp-proxy-transport-implementation.md`
- **ProxyServerとの比較**: `claudedocs/mcp-proxy-vs-proxyserver-comparison.md`
- **動作検証レポート**: `claudedocs/mcp-proxy-verification-report.md`
