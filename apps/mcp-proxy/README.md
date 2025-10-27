# MCP Proxy

複数のリモートMCPサーバーを統合し、単一のエンドポイントで公開するプロキシサーバー。

## 概要

- **複数Remote MCP統合**: 名前空間ベースルーティング、接続プール管理
- **ステートレス設計**: Cloud Run対応、水平スケール可能
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

- `GET /health` - ヘルスチェック
- `POST /mcp` - MCPプロトコルハンドラー（認証必須）
  - `tools/list` - 利用可能なツールのリスト取得
  - `tools/call` - ツールの実行

## 環境変数

```bash
# サーバー設定
PORT=8080
NODE_ENV=production

# データベース
DATABASE_URL=postgresql://...

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
      url: "https://mcp.example.com/sse", // SSEエンドポイント
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
      authType: "bearer",
      authToken: process.env.SLACK_TOKEN,
      headers: {},
    },
  },
};
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
