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
│   ├── manager/                  # Next.js 15 + React 19 Webアプリケーション（ポート 3000）
│   │   ├── src/app/             # App Router ページとレイアウト
│   │   ├── src/components/       # 共有コンポーネント
│   │   ├── src/server/api/       # tRPC API ルーター
│   │   └── public/logos/        # MCPサーバー用SVGロゴ
│   └── proxyServer/             # MCP プロキシサーバー（ポート 8080）
│       ├── src/services/proxy.ts # MCP プロトコル処理
│       ├── src/lib/             # ログ、メトリクス、設定、データ圧縮
│       └── ecosystem.config.js   # PM2設定ファイル
├── packages/
│   ├── db/                      # 共有 Prisma データベースパッケージ
│   │   ├── prisma/schema/       # 分割された Prisma スキーマ
│   │   └── src/                 # DB クライアントと型定義
│   ├── auth/                    # Auth0 認証パッケージ
│   ├── utils/                   # ユーティリティ関数（favicon処理等）
│   ├── mailer/                  # メール送信機能
│   └── scripts/                 # データベーススクリプト・MCP管理
├── tooling/                     # 共有開発ツール設定
│   ├── eslint/                  # ESLint 設定
│   ├── prettier/                # Prettier 設定
│   ├── tailwind/                # Tailwind CSS 設定
│   ├── typescript/              # TypeScript 設定
│   └── github/                  # GitHub Actions設定
└── docker/                      # Docker Compose 設定
```

### 技術スタック

- **フロントエンド**: Next.js 15 + React 19 + App Router + tRPC + Tailwind CSS + Radix UI
- **バックエンド**: Express/Hono + MCP SDK + リアルタイム通信用 SSE + PM2プロセス管理
- **データベース**: PostgreSQL + フィールド暗号化と Neon アダプター付き Prisma + Redis キャッシュ
- **認証**: Auth0 ベース認証システム（OAuth対応）
- **AI**: 複数プロバイダー対応 Vercel AI SDK
- **モノレポ**: Turbo + pnpm ワークスペース
- **開発・運用**: Docker Compose + GitHub Actions CI/CD

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

# PM2プロセス管理（ProxyServerディレクトリで実行）
cd apps/proxyServer
pnpm pm2:start           # PM2でサーバー起動
pnpm pm2:logs            # PM2ログ確認
pnpm pm2:status          # PM2ステータス確認
pnpm pm2:restart         # PM2再起動
pnpm pm2:stop            # PM2停止
```

### Docker デプロイメント

```bash
# 開発 Docker 環境（自己署名SSL）
docker compose -f ./docker/compose.dev.yaml up -d

# Let's Encrypt SSL付き本番環境
docker compose -f ./docker/compose.prod.yaml up -d
```

## 開発ガイドライン

### フロントエンド コーディング規約

- **コンポーネント**: 関数コンポーネント + アロー関数、必須の Props 型定義
- **関数定義**: 全ての関数はアロー関数で記述する（`const fn = () => {}` 形式）
- **スタイリング**: Tailwind CSS 使用、カスタムスタイルは `styles/globals.css`
- **データフェッチング**: tRPC 使用（`trpc.useQuery()`, `trpc.useMutation()`）
- **状態管理**: ローカルは `useState`、グローバルは Jotai
- **パフォーマンス**: `React.memo()`, `useCallback`, `useMemo` の適切な使用
- **型定義**: 共有型は `@tumiki/db` から import

### テストコーディング規約

- **フレームワーク**: `test` 使用（`it` ではない）、日本語テスト名
- **アサーション**: `toStrictEqual` 使用（`toEqual` ではない）
- **構造**: `describe` ブロックは関数名、古典派単体テスト
- **実行**: `pnpm test`、特定ファイル実行も対応
- **カバレッジ**: vitest を使ってカバレッジ100%を目標

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
- `auth.prisma` - Auth0認証テーブル
- `mcpServer.prisma` - MCP サーバー定義とツール
- `userMcpServer.prisma` - ユーザー固有のサーバー設定
- `organization.prisma` - マルチテナント組織サポート
- `chat.prisma` - チャット/メッセージング機能
- `apiKey.prisma` - APIキー管理
- `waitingList.prisma` - ウェイティングリスト機能

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

- **プロバイダー**: Auth0 統合認証
- **設定**: `packages/auth/src/config.ts`
- **セッション**: JWT ベース、Auth0セッション管理
- **ウェブフック**: Post-Login Action による動的ユーザー管理

### セキュリティ機能

- 機密データ（API キー、トークン）のフィールドレベル暗号化
- Auth0 統合認証・認可
- ロールベースアクセス制御
- JWT セッション管理
- ウェブフックシークレット検証

## 環境設定

### 必須環境変数

```bash
# データベース
DATABASE_URL=              # PostgreSQL 接続 URL
REDIS_URL=                 # Redis 接続 URL

# Auth0認証
AUTH0_SECRET=              # Auth0 シークレット
AUTH0_DOMAIN=              # Auth0 ドメイン
AUTH0_CLIENT_ID=           # Auth0 クライアント ID
AUTH0_CLIENT_SECRET=       # Auth0 クライアントシークレット
APP_BASE_URL=              # アプリケーションベース URL
AUTH0_WEBHOOK_SECRET=      # ウェブフック検証用シークレット

# Prisma暗号化
PRISMA_FIELD_ENCRYPTION_KEY=     # フィールド暗号化キー
PRISMA_FIELD_DECRYPTION_KEYS=    # 復号化キー（複数対応）
PRISMA_FIELD_ENCRYPTION_HASH_SALT= # ハッシュ化ソルト

# 運用設定
NODE_ENV=                  # development/test/production
METRICS_ENABLED=           # メトリクス有効化フラグ
API_KEY_PREFIX=            # APIキープレフィックス
API_KEY_LENGTH=            # APIキー長
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
- **データ圧縮**: MCPリクエストデータの圧縮によるパフォーマンス最適化
- **リクエストログ**: ProxyServerでのMCPリクエスト監視・分析
- **PM2管理**: 本番環境でのプロセス管理と自動復旧
- **メトリクス収集**: リアルタイムパフォーマンス監視

# 完了条件

- lint, prettier, typecheck, test, build が通ること
- vitest を使ってカバレッジを100%にすること
- 関連ドキュメントの更新完了させること
- PM2での本番環境デプロイが正常に動作すること
- MCPサーバーの統合テストが成功すること
