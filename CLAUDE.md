# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**Tumiki** は、Next.js ウェブアプリケーションと Node.js プロキシサーバーで構築された MCP (Model Context Protocol) サーバー管理システムです。複数の MCP サーバーの一元管理、API キー管理、MCP クライアント向けの統一アクセス URL を提供します。

### 重要な概念
- **MCP (Model Context Protocol)**: AIモデルが外部ツールやデータソースと安全に通信するためのプロトコル
- **プロキシサーバー**: 複数のMCPサーバーを単一エンドポイントで統合し、SSE/HTTP両方のトランスポートをサポート
- **ユーザーMCPサーバー**: ユーザーが個別に設定・管理する MCP サーバーインスタンス

## アーキテクチャ

### モノレポ構造と主要ディレクトリ

```
tumiki/
├── apps/
│   ├── manager/                  # Next.js ウェブアプリケーション（ポート 3000）
│   │   ├── src/app/             # App Router ページとレイアウト
│   │   ├── src/components/       # 共有コンポーネント
│   │   ├── src/server/api/       # tRPC API ルーター
│   │   └── src/env.js           # 型安全な環境変数設定
│   └── proxyServer/             # MCP プロキシサーバー（ポート 8080）
│       ├── src/services/proxy.ts # MCP プロトコル処理
│       └── src/lib/             # ログ、メトリクス、設定
├── packages/
│   ├── db/                      # 共有 Prisma データベースパッケージ
│   │   ├── prisma/schema/       # 分割された Prisma スキーマ
│   │   └── src/                 # DB クライアントと型定義
│   ├── auth/                    # NextAuth.js 設定
│   └── ui/                      # 共有 UI コンポーネント（Radix UI ベース）
├── tooling/                     # 共有開発ツール設定
│   ├── eslint/                  # ESLint 設定
│   ├── prettier/                # Prettier 設定
│   ├── tailwind/                # Tailwind CSS 設定
│   └── typescript/              # TypeScript 設定
└── docker/                      # Docker Compose 設定
```

### 技術スタック

- **フロントエンド**: Next.js 15 + React 19 + App Router + tRPC + Tailwind CSS + Radix UI
- **バックエンド**: Express/Hono + MCP SDK + リアルタイム通信用 SSE
- **データベース**: PostgreSQL + フィールド暗号化と Neon アダプター付き Prisma
- **認証**: Google/GitHub OAuth 対応 NextAuth.js
- **AI**: 複数プロバイダー対応 Vercel AI SDK
- **モノレポ**: Turbo + pnpm ワークスペース

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
pnpm lint:ws             # ワークスペース依存関係チェック（sherif）
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

### ProxyServer 管理

```bash
pnpm inspector           # MCP Inspector による接続テスト
```

### Docker デプロイメント

```bash
# 基本 Docker 環境
docker compose -f ./docker/compose.yaml up -d

# 自己署名SSL付き開発環境
docker compose -f ./docker/compose.dev.yaml up -d

# Let's Encrypt SSL付き本番環境
docker compose -f ./docker/compose.prod.yaml up -d
```

## 開発ガイドライン

### フロントエンド コーディング規約

- **コンポーネント**: 関数コンポーネント + アロー関数、必須の Props 型定義
- **スタイリング**: Tailwind CSS 使用、カスタムスタイルは `styles/globals.css`
- **データフェッチング**: tRPC 使用（`trpc.useQuery()`, `trpc.useMutation()`）
- **状態管理**: ローカルは `useState`、グローバルは Jotai
- **パフォーマンス**: `React.memo()`, `useCallback`, `useMemo` の適切な使用
- **型定義**: 共有型は `@tumiki/db` から import

### テストコーディング規約

- **フレームワーク**: `test` 使用（`it` ではない）、日本語テスト名
- **アサーション**: `toStrictEqual` 使用（`toEqual` ではない）
- **構造**: `describe` ブロックは関数名、古典派単体テスト
- **実行**: `bun test`、特定ファイル: `bun test ファイル名`

### Pull Request 作成ルール

コミット時は `.cursor/rules/pr-rule.md` のテンプレートに従い、以下を含める：

- 変更内容の概要と理由
- 実装の詳細
- テスト内容
- チェックリスト完了確認

## 重要なアーキテクチャパターン

### データベーススキーマ構成

Prisma スキーマは複数のファイルに分割（`packages/db/prisma/schema/`）：

- `base.prisma` - コア設定とジェネレーター
- `nextAuth.prisma` - 認証テーブル
- `mcpServer.prisma` - MCP サーバー定義とツール
- `userMcpServer.prisma` - ユーザー固有のサーバー設定
- `organization.prisma` - マルチテナント組織サポート
- `chat.prisma` - チャット/メッセージング機能

### API アーキテクチャ

- **tRPC ルーター**: `apps/manager/src/server/api/routers/` に配置
  - `mcpServer.ts` - 定義済みMCPサーバーテンプレート管理
  - `userMcpServerConfig.ts` - ユーザー固有のMCPサーバー設定
  - `userMcpServerInstance.ts` - 実行中のMCPサーバーインスタンス管理
  - `post.ts` - 汎用投稿機能
- **MCP プロキシサーバー**: `apps/proxyServer/src/index.ts`
  - `/mcp` - HTTP/Streamable transport エンドポイント
  - `/sse` - SSE transport エンドポイント（後方互換性）
  - `/messages` - SSE メッセージ送信
- **型安全性**: 自動 API 生成によるフルスタック型安全性、@tumiki/db から型 import

### 認証アーキテクチャ

- **プロバイダー**: Google OAuth, GitHub OAuth
- **設定**: `packages/auth/src/config.ts`
- **セッション**: JWT ベース、NextAuth.js
- **アダプター**: PrismaAdapter を使用

### セキュリティ機能

- 機密データ（API キー、トークン）のフィールドレベル暗号化
- Google/GitHub OAuth 認証
- ロールベースアクセス制御
- JWT セッション管理

## 環境設定

### 必須環境変数（apps/manager/src/env.js で型安全定義）

```bash
DATABASE_URL=              # PostgreSQL 接続 URL
AUTH_SECRET=               # NextAuth.js シークレット（本番環境では必須）
AUTH_GOOGLE_ID=            # Google OAuth クライアント ID
AUTH_GOOGLE_SECRET=        # Google OAuth クライアントシークレット
NODE_ENV=                  # development/test/production
```

### 開発時の重要事項

- **Node.js**: >=22.14.0 必須
- **パッケージマネージャー**: pnpm@10.11.0 以上
- **型チェック**: 全パッケージで TypeScript strict モード
- **コミット前**: 必ず `pnpm check` 実行（CI環境変数エラーは開発時は無視可能）
- **型インポート**: Prisma 型は `@tumiki/db` から import（`@prisma/client` ではない）
- **ページ構造**: 英語版 `/` と日本語版 `/jp` の2つのランディングページが存在

### CI/CD

- **GitHub Actions**: `.github/workflows/ci.yml`
- **品質チェック**: `pnpm check` で lint + format + typecheck
- **Node メモリ**: `NODE_OPTIONS: --max-old-space-size=4096`

### Turbo タスク管理

並列実行とキャッシュ活用により高速化：

- `build` - アプリケーションビルド
- `dev` - 開発サーバー起動
- `lint` - ESLint実行
- `format` - Prettier実行
- `typecheck` - TypeScript型チェック

### MCP サーバー管理の重要なパターン

1. **MCPサーバーテンプレート**: `mcpServer` テーブルで定義される利用可能なMCPサーバー種別
2. **ユーザー設定**: `userMcpServerConfig` でユーザー固有の設定（APIキー等）
3. **実行インスタンス**: `userMcpServerInstance` で実際に動作中のサーバー状態を管理
4. **プロキシ統合**: ProxyServerが複数のMCPサーバーを単一エンドポイントで統合

### ランディングページの多言語対応

- **英語版**: `/apps/manager/src/app/page.tsx` → `/apps/manager/src/app/_components/site/en/`
- **日本語版**: `/apps/manager/src/app/jp/page.tsx` → `/apps/manager/src/app/_components/site/jp/`
- **言語切替**: `LanguageToggle.tsx` コンポーネントでページ間遷移
- **サービスロゴ**: `/public/logos/` 内のSVGファイルを使用してアニメーション表示

### 重要な実装パターン

- **フィールド暗号化**: 機密データ（APIキー等）はPrismaの暗号化機能で保護
- **SSE通信**: リアルタイムMCP通信にServer-Sent Eventsを使用
- **セッション管理**: MCPサーバーとの永続的な接続をセッションで管理
- **エラーハンドリング**: tRPCによる型安全なエラー処理とユーザー向けメッセージ
