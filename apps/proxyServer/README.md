# MCP Proxy Server with Streamable HTTP

複数の MCP サーバーを統合管理する次世代プロキシサーバー

## 概要

このプロキシサーバーは、複数の Model Context Protocol (MCP) サーバーを単一のエンドポイントで統合的に管理します。**Streamable HTTP transport**を採用し、MCP最新仕様に準拠した高性能なプロキシ機能を提供します。

## 特徴

- **Streamable HTTP Transport**: MCP最新仕様準拠の統合transport
- **単一エンドポイント**: `/mcp` で全MCP通信を統合管理
- **セッション管理**: UUIDベースの効率的なセッション管理
- **高可用性**: 自動接続回復とヘルスチェック機能
- **スケーラブル**: ステートレス対応によるスケーリング容易性
- **インフラ親和性**: プロキシ、ロードバランサー対応
- **メトリクス監視**: リアルタイム性能監視とエラートラッキング

## インストール

依存関係のインストール:

```bash
pnpm install
```

## 使用方法

### 開発環境

```bash
# 依存関係のインストール
pnpm install

# ビルド
pnpm build

# 開発サーバー起動
pnpm start

# 型チェック
pnpm typecheck
```

### 本番環境

```bash
# 本番サーバー起動（PM2使用）
pnpm start:prod

# ログ確認
pnpm pm2:logs

# サーバー停止
pnpm pm2:stop
```

## API エンドポイント

### 統合MCPエンドポイント

- **URL**: `http://localhost:8080/mcp`
- **Methods**: `POST`, `GET`, `DELETE`
- **Transport**: Streamable HTTP

#### POST - JSON-RPC メッセージ送信

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY" \
  -H "mcp-session-id: SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

#### GET - SSE ストリーム（オプション）

```bash
curl -N http://localhost:8080/mcp \
  -H "api-key: YOUR_API_KEY" \
  -H "mcp-session-id: SESSION_ID"
```

#### DELETE - セッション終了

```bash
curl -X DELETE http://localhost:8080/mcp \
  -H "mcp-session-id: SESSION_ID"
```

## 技術スタック

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Transport**: @modelcontextprotocol/sdk StreamableHTTP
- **Process Manager**: PM2
- **Language**: TypeScript
- **主要依存関係**:
  - @modelcontextprotocol/sdk
  - express
  - zod

## アーキテクチャ

```
src/
├── index.ts              # メインサーバー（統合エンドポイント）
├── routes/
│   ├── health.ts         # ヘルスチェック
│   └── mcp.ts           # 統合MCPエンドポイント
├── services/
│   ├── transport.ts      # StreamableHTTP transport管理
│   └── proxy.ts         # MCPプロキシ機能
├── lib/                 # ユーティリティ
│   ├── config.ts
│   ├── logger.ts
│   ├── metrics.ts
│   └── types.ts
└── lifecycle/           # アプリケーションライフサイクル
    ├── startup.ts
    ├── shutdown.ts
    └── maintenance.ts
```

## 移行について

### SSE Transport から Streamable HTTP への移行

このバージョンでは、従来のSSE transportから最新のStreamable HTTP transportに完全移行しました：

- **統合エンドポイント**: `/mcp` + `/messages` → `/mcp`（単一）
- **セッション管理**: SSEベース → HTTPヘッダーベース
- **レスポンス形式**: JSON単発またはSSEストリーム（動的選択）
- **後方互換性**: 既存クライアントの段階的移行をサポート
