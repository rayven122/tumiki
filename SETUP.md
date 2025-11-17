# Tumiki 環境構築セットアップガイド

このドキュメントは、Tumikiプロジェクトを初回セットアップするための詳細な手順を説明します。

## 前提条件

- Node.js >=22.14.0
- pnpm >=10.11.0
- Git
- Docker (推奨)

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/rayven122/mcp-server-manager tumiki
cd tumiki
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

#### Vercel CLIを使用した環境変数の取得

開発環境の環境変数をVercelプロジェクトから取得：

```bash
# Vercel CLIのインストール（未インストールの場合）
npm i -g vercel

# Vercelプロジェクトにログイン
vercel login

# 開発環境の環境変数を.envにpull
vercel env pull .env
```

#### DATABASE_URLの設定

**Dockerを使用する場合（推奨）：**

DockerのPostgreSQLコンテナを起動した後、以下のDATABASE_URLを使用：

```bash
# Docker PostgreSQLコンテナ起動
docker compose -f ./docker/compose.dev.yaml up -d

# .envファイルにDocker PostgreSQL URLを設定
DATABASE_URL="postgresql://postgres:password@localhost:5432/tumiki"
```

**Neon DBを使用する場合：**

Neon DBのダッシュボードから接続URLを取得し、DATABASE_URLに設定：

- **Neon プロジェクト**: <https://console.neon.tech/app/projects/blue-hat-21566859/branches>

```bash
# NeonDBの接続URL例
DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/database?sslmode=require"
```

### 4. データベースのセットアップ

```bash
# packages/db ディレクトリに移動
cd packages/db
pnpm db:deploy   # 最新のマイグレーションを反映してデータベースを初期化
```

**注意：** `pnpm db:deploy`コマンドは最新のマイグレーションをデータベースに反映します。環境変数の設定とDockerコンテナの起動を先に完了させてから実行してください。

### 5. 開発サーバーの起動

```bash
# すべてのアプリケーション
pnpm dev

# または個別起動
cd apps/manager && pnpm dev   # Manager（ポート3000）
cd apps/mcp-proxy && pnpm dev # MCP Proxy（ポート8080）
```

## アクセス確認

セットアップが完了したら、以下のURLでアプリケーションにアクセスできます：

- **Manager（Webアプリケーション）**: <http://localhost:3000>
- **MCP Proxy（MCPプロキシ）**: <http://localhost:8080>

## トラブルシューティング

### Docker関連の問題

```bash
# コンテナの状態確認
docker compose -f ./docker/compose.dev.yaml ps

# ログ確認
docker compose -f ./docker/compose.dev.yaml logs

# コンテナの再起動
docker compose -f ./docker/compose.dev.yaml restart
```

### データベース関連の問題

```bash
# packages/dbディレクトリで実行
cd packages/db

# マイグレーションの状態確認
pnpm db:status

# Prisma Studio でデータベース確認
pnpm db:studio
```

### 依存関係の問題

```bash
# node_modulesのクリーンアップ
pnpm clean

# 依存関係の再インストール
pnpm install
```

## 次のステップ

セットアップが完了したら、[README.md](./README.md) を参照して開発コマンドやプロジェクト構造について理解を深めてください。
