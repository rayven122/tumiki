# MCP Proxy

複数のリモートMCPサーバーを統合し、単一のエンドポイントで公開するプロキシサーバー。

## 概要

- **複数Remote MCP統合**: 名前空間ベースルーティング、マルチトランスポート対応
- **ステートレス設計**: Cloud Run対応、水平スケール可能
- **HTTP Transport**: クライアント向けHTTPインターフェース（JSON-RPC over HTTP）
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
- **固定インスタンスID**: `dev-instance-id` を使用

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
# 初期化（MCPプロトコルハンドシェイク）
curl -X POST http://localhost:8080/mcp/dev-instance-id \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# ツールリスト取得（認証なし）
curl -X POST http://localhost:8080/mcp/dev-instance-id \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# ツール実行（認証なし）
curl -X POST http://localhost:8080/mcp/dev-instance-id \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
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

### MCP HTTP Transport

- `POST /mcp/:mcpServerId` - MCPプロトコルハンドラー（JSON-RPC over HTTP、認証必須）
  - `initialize` - MCPプロトコル初期化ハンドシェイク
  - `tools/list` - 利用可能なツールのリスト取得
  - `tools/call` - ツールの実行

### トランスポートアーキテクチャ

**クライアント向けインターフェース:**

- HTTP Transport（JSON-RPC over HTTP）のみ提供

**リモートMCPサーバー接続:**
このプロキシサーバーは以下のトランスポートを使用してリモートMCPサーバーに接続します：

- **Streamable HTTP**: 最新のMCPプロトコル（推奨）
- **SSE (Server-Sent Events)**: レガシーサポート（HTTPからの自動フォールバック）
- **Stdio**: ローカルプロセス起動

## 環境変数

```bash
# サーバー設定
PORT=8080
NODE_ENV=production

# 開発モード（開発環境のみ）
DEV_MODE=false  # true で認証バイパス + Context7固定接続

# データベース
DATABASE_URL=postgresql://...

# Redis（キャッシュ）
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# キャッシュ暗号化
CACHE_ENCRYPTION_KEY=64文字の16進数文字列  # 32バイト（256ビット）の暗号化キー

# ログ設定
LOG_LEVEL=info  # info, warn, error, debug
```

### キャッシュ暗号化キーの生成

Redis に保存されるキャッシュデータ（MCP サーバー設定、API キー、環境変数等）は AES-256-GCM で暗号化されます。

新しい暗号化キーを生成：

```bash
# Node.js を使用
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# または openssl を使用
openssl rand -hex 32
```

⚠️ **セキュリティ上の注意:**

- **開発環境と本番環境で異なるキーを使用してください**
- **キーは厳重に管理し、決してリポジトリにコミットしないでください**
- **キーを変更すると既存のキャッシュは復号化できなくなりますが、自動的にクリアされます**

## MCPサーバー設定

本番環境では、MCPサーバーの設定はデータベース（UserMcpServerInstance、ToolGroup）で管理されます。

### ツール名の形式

プロキシは名前空間付きのツール名を使用します：

```text
context7.resolve-library-id
context7.get-library-docs
github.create_issue
slack.send_message
```

各ツールは `{namespace}.{originalToolName}` の形式でアクセスできます。

## 使用例

### 初期化

```bash
curl -X POST http://localhost:8080/mcp/your-instance-id \
  -H "Tumiki-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "my-client",
        "version": "1.0.0"
      }
    }
  }'
```

レスポンス例：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "Tumiki MCP Proxy",
      "version": "0.1.0"
    }
  }
}
```

### ツールリストの取得

```bash
curl -X POST http://localhost:8080/mcp/your-instance-id \
  -H "Tumiki-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

レスポンス例：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
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
curl -X POST http://localhost:8080/mcp/your-instance-id \
  -H "Tumiki-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
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
# Tumiki-API-Key ヘッダー
Tumiki-API-Key: tumiki_live_abc123...

# または Authorization: Bearer
Authorization: Bearer tumiki_live_abc123...
```

## デプロイ

### Cloud Run（推奨）

本番環境での推奨デプロイ方法です。

#### カスタムドメイン（Staging/Production環境のみ）

Staging/Production環境には自動的にカスタムドメインが設定されます：

| 環境       | Cloud Runサービス              | カスタムドメイン                  | URL形式                                            |
| ---------- | ------------------------------ | --------------------------------- | -------------------------------------------------- |
| Preview    | `tumiki-mcp-proxy-pr-{PR番号}` | なし                              | `https://tumiki-mcp-proxy-pr-{PR番号}-*.a.run.app` |
| Staging    | `tumiki-mcp-proxy-staging`     | `https://stg-server.tumiki.cloud` | `https://tumiki-mcp-proxy-staging-*.a.run.app`     |
| Production | `tumiki-mcp-proxy-production`  | `https://server.tumiki.cloud`     | `https://server.tumiki.cloud`                      |

**Preview環境**: 各PRごとに独立したCloud Runサービスが作成されます（例: PR #372 → `tumiki-mcp-proxy-pr-372`）

- PRクローズ時に自動的にCloud Runサービスが削除されます

**Staging/Production**: 初回デプロイ時にGitHub Actionsが自動的にカスタムドメインを設定します。

詳細は [Cloud Run カスタムドメイン設定](../../docs/cloudrun-custom-domain.md) を参照。

#### GitHub Actions経由（自動）

- **Preview**: Pull Request作成時に自動デプロイ
- **Staging**: `main` ブランチへマージ時に自動デプロイ
- **Production**: `v*` タグプッシュ時に自動デプロイ

#### ローカルから手動デプロイ

```bash
# Docker イメージのビルドとプッシュ
docker build -t asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:staging-latest \
  -f apps/mcp-proxy/Dockerfile .
docker push asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:staging-latest

# Cloud Run へデプロイ
gcloud run deploy tumiki-mcp-proxy-staging \
  --image=asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:staging-latest \
  --region=asia-northeast1
```

#### 詳細ガイド

詳細なセットアップ手順、運用管理、トラブルシューティングについては、[Cloud Run デプロイメントガイド](../../docs/cloudrun-mcp-proxy-deployment.md)を参照してください。

## アーキテクチャ

詳細な設計については以下のドキュメントを参照してください：

- **設計概要**: `claudedocs/mcp-proxy-design.md`
- **動作検証レポート**: `claudedocs/mcp-proxy-verification-report.md`
