# Tumiki

複数のMCPサーバーを一元管理し、効率的なAPI管理を実現するためのWebアプリケーションです。

## 🚀 クイックスタート

初回セットアップの詳細な手順については、[SETUP.md](./SETUP.md) を参照してください。

### Docker開発環境

開発に必要なDockerコンテナを管理：

```bash
# 開発コンテナを起動（PostgreSQL、Redis、Keycloak）
pnpm docker:up

# コンテナを停止
pnpm docker:stop
```

## 主な機能

- 複数のMCPサーバーの一元管理
- サーバーの状態監視と制御
- APIキーの安全な管理
- 統合URLの生成と管理
- ツールの選択的な公開
- プロキシサーバーによる単一エンドポイントでのMCPサーバー統合

## プロジェクト構造

このプロジェクトはTurboを使用したモノレポ構造になっています。

```
tumiki/
├── apps/
│   ├── manager/          # Next.js 15 + React 19 Webアプリケーション
│   └── mcp-proxy/        # MCPサーバープロキシ（Hono + Cloud Run）
├── packages/             # 共有パッケージ
│   ├── db/              # Prisma データベースパッケージ
│   ├── auth/            # Auth0 認証パッケージ
│   ├── mailer/          # メール送信機能
│   └── scripts/         # データベーススクリプト
├── tooling/              # 開発ツール設定
│   ├── eslint/          # ESLint設定
│   ├── prettier/        # Prettier設定
│   ├── tailwind/        # Tailwind CSS設定
│   ├── typescript/      # TypeScript設定
│   └── github/          # GitHub Actions設定
└── docker/              # Docker Compose設定
```

## 技術スタック

### Manager（Webアプリケーション）

- [Next.js 15](https://nextjs.org) - React 19 + App Router
- [tRPC](https://trpc.io) - 型安全API
- [Tailwind CSS](https://tailwindcss.com) - CSSフレームワーク
- [Radix UI](https://www.radix-ui.com/) - UIコンポーネントライブラリ
- [Auth0](https://auth0.com) - 認証・認可
- [Vercel AI SDK](https://sdk.vercel.ai) - AI統合

### ProxyServer（MCPプロキシ）

- [Express](https://expressjs.com) / [Hono](https://hono.dev) - Webフレームワーク
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK
- Server-Sent Events (SSE) - リアルタイム通信
- PM2 - プロセス管理

### データベース・認証

- [PostgreSQL](https://postgresql.org) - メインデータベース
- [Prisma](https://prisma.io) - ORM + フィールド暗号化
- [Neon](https://neon.tech) - PostgreSQL ホスティング
- [Redis](https://redis.io) - キャッシュ・セッション管理

### 開発・運用

- [Turbo](https://turbo.build/repo) - モノレポビルドシステム
- [TypeScript](https://www.typescriptlang.org) - 型安全性
- [ESLint](https://eslint.org) - コード品質
- [Prettier](https://prettier.io) - コードフォーマット
- [Docker](https://docker.com) - コンテナ化
- [GitHub Actions](https://github.com/features/actions) - CI/CD

## アプリケーション

### Manager（Webアプリケーション）

MCPサーバーの管理画面を提供するNext.js 15 + React 19アプリケーション。

- **URL**: <https://local.tumiki.cloud:3000>
- **ポート**: 3000
- **機能**:
  - MCPサーバー設定・監視
  - APIキー管理
  - ChatGPT風チャット機能
  - Auth0認証
  - 多言語対応（英語・日本語）

### ProxyServer（MCPプロキシ）

複数のMCPサーバーを単一エンドポイントで統合するプロキシサーバー。

- **URL**: <http://localhost:8080>
- **エンドポイント**:
  - `/mcp` - HTTP/Streamable transport
  - `/sse` - SSE transport（後方互換性）
  - `/messages` - SSE メッセージ送信
- **機能**:
  - リクエストデータ圧縮
  - リクエストログ機能
  - メトリクス収集
  - PM2プロセス管理

## 開発コマンド

### 基本操作

```bash
# 依存関係のインストール（Python MCPサーバーも自動インストール）
pnpm install

# Python MCPサーバーのインストールをスキップする場合
SKIP_PYTHON_MCP=1 pnpm install

# 開発サーバーの起動
pnpm dev

# ビルド
pnpm build

# 本番サーバーの起動
pnpm start
```

### Python MCP サーバーのサポート

Tumikiは Node.js ベースの MCP サーバーに加えて、Python ベースの MCP サーバーもサポートしています。

```bash
# Python MCPサーバーの自動インストール
# pnpm install 時に自動的に実行されます
node scripts/install-python-mcp.js

# 手動でPython MCPサーバーをインストール
uv tool install analytics-mcp  # Google Analytics MCP

# Python MCPサーバーの追加
# python-mcp-requirements.txt に追記して pnpm install を実行
```

**前提条件**:

- Python 3.10 以上
- uv（高速な Python パッケージマネージャー）

詳細は [docs/development/python-mcp-setup.md](./docs/development/python-mcp-setup.md) を参照してください。

### コード品質

```bash
# 全品質チェック（lint + format + typecheck）
pnpm check

# リンター
pnpm lint
pnpm lint:fix

# コードフォーマット
pnpm format
pnpm format:fix

# 型チェック
pnpm typecheck
```

### データベース操作

```bash
# packages/db ディレクトリで実行
cd packages/db

# マイグレーション実行
pnpm db:migrate

# 本番環境にマイグレーションをデプロイ
pnpm db:deploy

# Prisma Studio を開く
pnpm db:studio

# Prisma クライアントと Zod スキーマを生成
pnpm db:generate
```

### Docker操作

```bash
# すべてのコンテナを起動（PostgreSQL、Redis、Keycloak）
pnpm docker:up

# コンテナを停止
pnpm docker:stop
```

#### Keycloak（OAuth認証基盤）

Keycloakを使用したOAuth認証の開発環境をセットアップします。

**アクセス情報**:
- 管理コンソール: http://localhost:8443/admin/
- ユーザー名: `admin` / パスワード: `admin123`
- 詳細は [docker/keycloak/README.md](./docker/keycloak/README.md) を参照

**環境変数設定**（`.env`）:
```bash
# Keycloak基本設定
KEYCLOAK_ISSUER=http://localhost:8443/realms/tumiki
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-manager-secret-change-in-production
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin123

# Google OAuth連携（オプション）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**注意**: Google OAuth連携を使用する場合のみ、`GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`を設定してください。設定するとGoogle IdP経由でのログインが自動的に有効化されます。

### ProxyServer管理

```bash
# MCP Inspector（接続テスト）
pnpm inspector

# MCP Proxy開発サーバー起動
cd apps/mcp-proxy
pnpm dev          # 開発サーバー起動
pnpm build        # ビルド
pnpm start        # 本番サーバー起動
```

### テスト・その他

```bash
# テスト実行
pnpm test         # 全テスト実行

# ワークスペース管理
pnpm lint:ws      # 依存関係チェック

# クリーンアップ
pnpm clean        # node_modules削除
pnpm clean:workspaces # 各ワークスペースのクリーンアップ
```

## 🔧 メンテナンスモード

システムメンテナンスやデータベースマイグレーション時に、サービスを一時的に停止できます。

### 有効化方法

1. 環境変数を設定:

```bash
MAINTENANCE_MODE=true
MAINTENANCE_ALLOWED_IPS="管理者IP1,管理者IP2"
MAINTENANCE_END_TIME="2025-01-11T03:00:00Z"
NEXT_PUBLIC_MAINTENANCE_END_TIME="2025-01-11T03:00:00Z"
```

2. デプロイ実行:

```bash
pnpm run deploy
```

### 無効化方法

1. 環境変数を変更:

```bash
MAINTENANCE_MODE=false
```

2. 再デプロイ:

```bash
pnpm run deploy
```

詳細な手順は [メンテナンスモード運用ガイド](./docs/operations/maintenance-mode.md) を参照してください。

### Stripe設定

本プロジェクトではStripeを使用した決済機能を実装しています。

#### 必要な環境変数

- `STRIPE_SECRET_KEY`: StripeのシークレットAPIキー
- `STRIPE_WEBHOOK_SECRET`: Webhook署名検証用のシークレット
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: クライアント側で使用する公開可能キー

#### 開発環境でのWebhookテスト

```bash
# Stripe環境変数の検証
pnpm verify:stripe

# Stripe CLIでWebhookをローカルに転送
pnpm stripe:listen
```

詳細なセットアップ手順は [Stripe開発環境セットアップガイド](./docs/development/stripe-setup.md) を参照してください。

## Docker環境詳細

### 統合されたDocker Compose構成

すべてのサービス（PostgreSQL、Redis、Keycloak）は単一の `docker/compose.yaml` ファイルで管理されています。

```bash
# 全サービスを起動
pnpm docker:up

# 全サービスを停止
pnpm docker:stop
```

### サービス構成

- **PostgreSQL (本番用)**: ポート 5432（Tumikiメインデータベース + Keycloak専用データベース）
- **PostgreSQL (テスト用)**: ポート 5433
- **Redis**: ポート 6379
- **Keycloak**: ポート 8443（メインPostgreSQL内の別データベースを使用）

## プロダクション デプロイメント

Tumikiプロジェクト全体を簡単にデプロイするための統合デプロイメントシステムを提供しています。

### 統合デプロイメント（推奨）

以下の単一コマンドで、Manager App（Vercel）とProxyServer（GCE）の両方を一括デプロイできます：

```bash
# 全コンポーネントの一括デプロイ（並列実行）
pnpm run deploy

# ドライラン（実行内容の確認）
pnpm run deploy:dry-run
```

#### 個別デプロイコマンド

```bash
# Manager App のみ（Vercel）
pnpm run deploy:vercel

# ProxyServer のみ（GCE）
pnpm run deploy:gce
```

#### オプション付きデプロイ

```bash
# Vercelのみデプロイ
SKIP_GCE=true pnpm deploy

# GCEのみデプロイ
SKIP_VERCEL=true pnpm deploy

```

### 前提条件

デプロイを実行する前に、以下の準備が必要です：

```bash
# Vercel CLI のインストールと認証
npm install -g vercel
vercel login
vercel link  # プロジェクトルートで実行

# Google Cloud CLI のインストールと認証
# https://cloud.google.com/sdk/docs/install
gcloud auth login
```

### ProxyServer の Google Compute Engine (GCE) へのデプロイ

ProxyServer を既存の GCE VM にデプロイして PM2 で管理する詳細な手順は、専用のドキュメントを参照してください。

📖 **[MCP Proxy デプロイメントガイド](./docs/architecture/mcp-proxy-design.md)**

#### クイックスタート

```bash
# Cloud Runデプロイ実行
cd apps/mcp-proxy
pnpm deploy

# 本番環境へデプロイ
pnpm deploy:production

# ドライラン（実行内容の確認）
pnpm deploy:dry-run
```

デプロイメントガイドには以下の詳細情報が含まれています：

- 前提条件とセットアップ
- デプロイプロセスの詳細説明
- 運用管理コマンド
- トラブルシューティング
- 環境変数管理
- ドライラン機能の使用方法
