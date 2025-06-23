# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを扱う際のガイダンスを提供します。

## プロジェクト概要

**Tumiki** は、Next.js ウェブアプリケーションと Node.js プロキシサーバーで構築された MCP (Model Context Protocol) サーバー管理システムです。複数の MCP サーバーの一元管理、API キー管理、MCP クライアント向けの統一アクセス URL を提供します。

## アーキテクチャ

### モノレポ構造
- `apps/manager/` - tRPC API、NextAuth、Prisma を備えた Next.js ウェブアプリケーション（ポート 3000）
- `apps/proxyServer/` - MCP プロトコル通信を処理する Express/Hono MCP プロキシサーバー（ポート 8080）
- `packages/db/` - マルチスキーマアーキテクチャを持つ共有 Prisma データベースパッケージ
- `tooling/` - ESLint、Prettier、Tailwind、TypeScript の共有設定

### 技術スタック
- **フロントエンド**: Next.js 15 + React 19 + App Router + tRPC + Tailwind CSS + Radix UI
- **バックエンド**: Express/Hono + MCP SDK + リアルタイム通信用 SSE
- **データベース**: PostgreSQL + フィールド暗号化と Neon アダプター付き Prisma
- **認証**: Google/GitHub OAuth 対応 NextAuth.js
- **AI**: 複数プロバイダー対応 Vercel AI SDK

## 開発コマンド

### コア開発
```bash
pnpm dev                  # 全アプリケーションをウォッチモードで開始
pnpm build               # 全アプリケーションをビルド
pnpm start               # 本番サーバーを開始
```

### コード品質
```bash
pnpm lint                # 全パッケージで ESLint 実行
pnpm lint:fix            # ESLint の問題を自動修正
pnpm format              # Prettier フォーマットをチェック
pnpm format:fix          # Prettier で自動フォーマット
pnpm typecheck           # TypeScript 型チェック
pnpm check               # 全品質チェック実行（lint + format + typecheck）
```

### データベース管理
```bash
# packages/db ディレクトリから実行
cd packages/db
pnpm db:migrate          # データベースマイグレーション実行
pnpm db:deploy           # 本番環境にマイグレーションをデプロイ
pnpm db:studio           # Prisma Studio を開く
pnpm db:generate         # Prisma クライアントと Zod スキーマを生成
```

### Docker デプロイメント
```bash
# 自己署名SSL付き開発環境
docker compose -f ./docker/compose.dev.yaml up -d

# Let's Encrypt SSL付き本番環境
docker compose -f ./docker/compose.prod.yaml up -d
```

## 重要なアーキテクチャパターン

### データベーススキーマ構成
Prisma スキーマは複数のファイルに分割されています：
- `base.prisma` - コア設定とジェネレーター
- `nextAuth.prisma` - 認証テーブル
- `mcpServer.prisma` - MCP サーバー定義とツール
- `userMcpServer.prisma` - ユーザー固有のサーバー設定
- `organization.prisma` - マルチテナント組織サポート
- `chat.prisma` - チャット/メッセージング機能

### API アーキテクチャ
- **tRPC ルーター**: `apps/manager/src/server/api/routers/` に配置
- **MCP プロキシ**: `apps/proxyServer/` で SSE 経由の MCP プロトコル通信を処理
- **型安全性**: 自動 API 生成によるフルスタック型安全性

### セキュリティ機能
- 機密データ（API キー、トークン）のフィールドレベル暗号化
- Google/GitHub OAuth 認証
- ロールベースアクセス制御
- JWT セッション管理

## 重要な注意事項

### 環境変数
必要な変数：`DATABASE_URL`、`AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`NODE_ENV`

### パッケージ管理
Node.js >=22.14.0 と pnpm@10.11.0 を使用した pnpm ワークスペースを使用。

### テストと品質
コード品質を確保するため、コミット前に必ず `pnpm check` を実行してください。全パッケージで TypeScript strict モードが適用されています。