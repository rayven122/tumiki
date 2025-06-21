# MCP Proxy Server with Dual Transport Support

複数の MCP サーバーを統合管理するデュアルTransport対応プロキシサーバー

## 概要

このプロキシサーバーは、複数の Model Context Protocol (MCP) サーバーを統合的に管理します。**Streamable HTTP transport**と**SSE transport**の両方をサポートし、既存システムの後方互換性を維持しながらMCP最新仕様に対応した高性能なプロキシ機能を提供します。

## 特徴

- **デュアルTransport対応**: Streamable HTTP + SSE の両方をサポート
- **後方互換性**: 既存SSEクライアントの継続利用が可能
- **統一セッション管理**: Transport種別を問わない共通セッション管理
- **段階的移行**: 必要に応じてTransportを選択可能
- **高可用性**: 自動接続回復とヘルスチェック機能
- **スケーラブル**: Transport抽象化によるスケーリング容易性
- **インフラ親和性**: プロキシ、ロードバランサー対応
- **統合メトリクス**: Transport別統計とリアルタイム監視

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

### Streamable HTTP Transport（推奨）

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

### SSE Transport（後方互換性）

- **SSE接続**: `http://localhost:8080/sse`
- **メッセージ送信**: `http://localhost:8080/messages`
- **Transport**: Server-Sent Events

#### SSE接続確立

```bash
curl -N http://localhost:8080/sse \
  -H "api-key: YOUR_API_KEY" \
  -H "x-client-id: CLIENT_ID"
```

#### メッセージ送信

```bash
curl -X POST "http://localhost:8080/messages?sessionId=SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
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
├── index.ts              # メインサーバー（デュアルTransport対応）
├── routes/
│   ├── health.ts         # ヘルスチェック
│   ├── mcp.ts           # Streamable HTTP エンドポイント
│   └── sse.ts           # SSE エンドポイント（後方互換性）
├── services/
│   ├── session.ts        # 統一セッション管理システム
│   ├── transport.ts      # Streamable HTTP transport管理
│   ├── connection.ts     # SSE接続管理
│   └── proxy.ts         # MCPプロキシ機能
├── lib/                 # ユーティリティ
│   ├── config.ts
│   ├── logger.ts
│   ├── metrics.ts       # Transport別統計
│   └── types.ts
└── lifecycle/           # アプリケーションライフサイクル
    ├── startup.ts
    ├── shutdown.ts      # デュアルTransport対応
    └── maintenance.ts
```

## Transport選択ガイド

### Streamable HTTP Transport（推奨）

**新規開発・最新仕様対応の場合**

- **エンドポイント**: `/mcp`
- **特徴**: MCP最新仕様準拠、HTTPヘッダーベースセッション管理
- **メリット**: インフラ親和性、スケーラビリティ、標準HTTP対応

### SSE Transport（後方互換性）

**既存システム継続利用の場合**

- **エンドポイント**: `/sse`, `/messages`
- **特徴**: 従来のSSE接続方式を維持
- **メリット**: 既存クライアントコード変更不要、段階的移行可能

## 移行戦略

### 段階的移行アプローチ

1. **現状維持**: 既存SSEクライアントは `/sse` + `/messages` で継続運用
2. **新規開発**: 新しいクライアントは `/mcp` のStreamable HTTPを使用
3. **段階移行**: 必要に応じて既存クライアントを順次移行
4. **完全移行**: 全クライアント移行後、SSEエンドポイント廃止検討

### Transport別特徴比較

| 項目                 | Streamable HTTP | SSE                        |
| -------------------- | --------------- | -------------------------- |
| **仕様準拠**         | MCP最新仕様     | 従来仕様                   |
| **エンドポイント数** | 1つ（`/mcp`）   | 2つ（`/sse`, `/messages`） |
| **セッション管理**   | HTTPヘッダー    | クエリパラメータ           |
| **インフラ対応**     | ◎ 高い          | △ 限定的                   |
| **メンテナンス性**   | ◎ 良好          | ○ 普通                     |
