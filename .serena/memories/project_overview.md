# Tumiki プロジェクト概要

## プロジェクトの目的
複数のMCPサーバーを一元管理し、効率的なAPI管理を実現するためのWebアプリケーション。

## 主な機能
- 複数のMCPサーバーの一元管理
- サーバーの状態監視と制御
- APIキーの安全な管理
- 統合URLの生成と管理
- ツールの選択的な公開
- プロキシサーバーによる単一エンドポイントでのMCPサーバー統合

## 技術スタック

### フロントエンド（Manager App）
- Next.js 15 + React 19（App Router）
- tRPC（型安全API）
- Tailwind CSS（スタイリング）
- Radix UI（UIコンポーネント）
- Keycloak（認証・認可）
- Jotai（グローバル状態管理）
- Vercel AI SDK

### バックエンド（ProxyServer）
- Express / Hono（Webフレームワーク）
- @modelcontextprotocol/sdk（MCP SDK）
- Server-Sent Events（リアルタイム通信）
- PM2（プロセス管理）

### データベース・インフラ
- PostgreSQL（メインDB）
- Prisma ORM（フィールド暗号化対応）
- Neon（PostgreSQLホスティング）
- Redis（キャッシュ・セッション管理）
- Stripe（決済システム）

### 開発・運用
- Turbo（モノレポビルドシステム）
- TypeScript（全体的な型安全性）
- Vitest（テストフレームワーク）
- Docker（コンテナ化）
- GitHub Actions（CI/CD）
- Vercel（Managerアプリのホスティング）
- Google Compute Engine（ProxyServerのホスティング）

## アプリケーション構成

### Manager（https://local.tumiki.cloud:3000）
- MCPサーバー設定・監視画面
- APIキー管理
- ChatGPT風チャット機能
- 多言語対応（英語・日本語）

### ProxyServer（http://localhost:8080）
- `/mcp` - HTTP/Streamable transport
- `/sse` - SSE transport（後方互換性）
- `/messages` - SSE メッセージ送信
- リクエストデータ圧縮
- リクエストログ機能
- メトリクス収集

## 環境要件
- Node.js: >=22.14.0
- pnpm: >=10.11.0
- TypeScript: strict モード