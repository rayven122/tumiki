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

### 開発モード（認証バイパス + Context7固定接続）

開発環境で簡単に動作検証を行うための開発モードが用意されています。

**機能:**

- **認証バイパス**: APIキーなしでアクセス可能
- **MCP接続先固定**: `https://mcp.context7.com/mcp` に固定接続

**使用方法:**

環境変数 `DEV_MODE=true` を設定して起動:

```bash
# 環境変数を設定して起動
DEV_MODE=true pnpm dev
```

または、`.env` ファイルに追加:

```bash
# .env
DEV_MODE=true
```

**動作確認:**

```bash
# ツールリスト取得（認証なし）
curl -X POST http://localhost:8080/mcp/dev-instance-id \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# ツール実行（認証なし）
curl -X POST http://localhost:8080/mcp/dev-instance-id \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "context7.resolve-library-id",
      "arguments": {
        "libraryName": "react"
      }
    }
  }'
```

**⚠️ 注意:**

- **開発環境でのみ使用してください**
- 本番環境では絶対に `DEV_MODE=true` を設定しないでください
- 開発モードではセキュリティチェックがバイパスされます

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

# Upstash Redis（セッション管理）
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ

# セッション設定
CONNECTION_TIMEOUT_MS=60000  # セッションタイムアウト（デフォルト: 60秒）
MAX_SESSIONS=200             # 最大セッション数（デフォルト: 200）

# ログ設定
LOG_LEVEL=info  # info, warn, error, debug
```

## MCPサーバー設定

本番環境では、MCPサーバーの設定はデータベース（UserMcpServerInstance、ToolGroup）で管理されます。

### サポートされるトランスポート

- **Streamable HTTP**: 最新のMCPプロトコル（推奨）
- **SSE (Server-Sent Events)**: レガシーサポート（自動フォールバック）
- **Stdio**: ローカルプロセス起動

### ツール名の形式

プロキシは名前空間付きのツール名を使用します：

```text
context7.resolve-library-id
context7.get-library-docs
```

各ツールは `{namespace}.{originalToolName}` の形式でアクセスできます。

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

### Upstash Redis のセットアップ

セッション管理には Upstash Redis（サーバーレス Redis）を使用します。無料プランで開始できます。

#### 1. Upstash アカウント作成

1. [Upstash Console](https://console.upstash.com/) にアクセス
2. GitHub または Google アカウントでサインアップ
3. 無料プラン（500K コマンド/月、256MB）を選択

#### 2. Redis データベースの作成

```bash
# Upstash Console で以下を実行:
1. "Create Database" をクリック
2. Database Name: mcp-proxy-sessions
3. Region: Asia Pacific (Tokyo) または最寄りのリージョン
4. Type: Regional（無料プラン）
5. "Create" をクリック
```

#### 3. 環境変数の取得

作成したデータベースの詳細ページから以下をコピー：

```bash
# REST API 情報
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
```

#### 4. Cloud Run への環境変数設定

```bash
# Cloud Run に環境変数を設定
gcloud run services update mcp-proxy \
  --region=asia-northeast1 \
  --set-env-vars="UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io,UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ"
```

**特徴:**

- ✅ **完全無料**: 50万コマンド/月まで無料
- ✅ **VPC 不要**: HTTP REST API のため VPC コネクタ不要
- ✅ **グローバル**: 自動レプリケーション
- ✅ **低レイテンシ**: エッジ配信で高速アクセス
- ✅ **スケール**: 従量課金で自動スケール

#### 5. ローカル開発時の設定

ローカル開発でも同じ Upstash Redis を使用：

```bash
# .env ファイルに追加
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
```

## アーキテクチャ

詳細な設計については以下のドキュメントを参照してください：

- **設計概要**: `claudedocs/mcp-proxy-design.md`
- **SSEクライアント機能**: `claudedocs/mcp-proxy-sse-client.md`
- **トランスポート実装状況**: `claudedocs/mcp-proxy-transport-implementation.md`
- **ProxyServerとの比較**: `claudedocs/mcp-proxy-vs-proxyserver-comparison.md`
- **動作検証レポート**: `claudedocs/mcp-proxy-verification-report.md`
