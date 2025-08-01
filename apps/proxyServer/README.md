# MCP Proxy Server

複数の MCP サーバーを統合管理するプロキシサーバー

## 概要

Model Context Protocol (MCP) サーバーを統合的に管理するプロキシサーバーです。Streamable HTTP transportとSSE transportの両方をサポートします。

## インストール

依存関係のインストール:

```bash
pnpm install
```

## 使用方法

```bash
# 開発サーバー起動
pnpm start

# 本番サーバー起動（PM2使用）
pnpm start:prod

# 検証
pnpm verify
```

## API エンドポイント

### Streamable HTTP Transport

- **エンドポイント**: `http://localhost:8080/mcp` (推奨)
- **メソッド**: GET, POST, DELETE
- **認証**: APIキー（クエリパラメータ、ヘッダー、またはBearer token）

#### POST /mcp

MCPサーバーへのリクエストを処理し、新しいセッションを作成します。

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"method": "tools/list"}'
```

#### GET /mcp

既存のセッション情報を取得します。

```bash
curl -X GET http://localhost:8080/mcp \
  -H "mcp-session-id: session-123" \
  -H "Authorization: Bearer your-api-key"
```

#### DELETE /mcp

セッションを終了します。

```bash
curl -X DELETE http://localhost:8080/mcp \
  -H "mcp-session-id: session-123" \
  -H "Authorization: Bearer your-api-key"
```

### SSE Transport (後方互換性)

- **エンドポイント**: `http://localhost:8080/sse`
- **メソッド**: POST
- **認証**: APIキー

## クイックスタート

```bash
# ProxyServer起動
pnpm start

# MCP Inspector検証（APIキーが必要）
TEST_API_KEY=your-api-key pnpm verify
```

## 認証

ProxyServerは以下の方法でAPIキー認証をサポートしています：

### APIキーの指定方法

1. **Authorizationヘッダー（推奨）**

   ```bash
   Authorization: Bearer your-api-key
   ```

2. **api-keyヘッダー**

   ```bash
   api-key: your-api-key
   ```

3. **クエリパラメータ**
   ```bash
   ?api-key=your-api-key
   ```

### セッション管理

- セッションIDは `mcp-session-id` ヘッダーで管理
- セッションは一定時間（デフォルト5分）でタイムアウト
- 各セッションはMCPサーバーとの永続的な接続を保持

## 技術スタック

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Transport**: @modelcontextprotocol/sdk
- **Process Manager**: PM2
- **Language**: TypeScript
- **ロギング**: Winston
- **メトリクス**: 内蔵メトリクスシステム
