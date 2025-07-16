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

- **Streamable HTTP**: `http://localhost:8080/mcp` (推奨)
- **SSE Transport**: `http://localhost:8080/sse` (後方互換性)

## クイックスタート

```bash
# ProxyServer起動
pnpm start

# MCP Inspector検証（APIキーが必要）
TEST_API_KEY=your-api-key pnpm verify
```

## 技術スタック

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Transport**: @modelcontextprotocol/sdk
- **Process Manager**: PM2
- **Language**: TypeScript
