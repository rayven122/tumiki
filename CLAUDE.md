# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**Tumiki** は、Next.js ウェブアプリケーションと Node.js プロキシサーバーで構築された MCP (Model Context Protocol) サーバー管理システムです。複数の MCP サーバーの一元管理、API キー管理、MCP クライアント向けの統一アクセス URL を提供します。

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
  - `mcpServer.ts` - MCP サーバー管理
  - `auth.ts` - 認証関連
  - `organization.ts` - 組織管理
- **MCP プロキシ**: `apps/proxyServer/src/services/proxy.ts` で SSE 経由の MCP プロトコル通信を処理
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
- **コミット前**: 必ず `pnpm check` 実行
- **型インポート**: Prisma 型は `@tumiki/db` から import（`@prisma/client` ではない）

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