# Tumiki 環境構築セットアップガイド

このドキュメントは、Tumikiプロジェクトを初回セットアップするための手順を説明します。

## 前提条件

- Node.js >=22.14.0
- pnpm >=10.11.0
- Git
- Docker & Docker Compose（必須）

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/rayven122/tumiki tumiki
cd tumiki
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成：

```bash
cp .env.example .env
```

`.env`ファイルを編集して以下の必須環境変数を設定：

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5434/tumiki"
DIRECT_URL="postgresql://postgres:password@localhost:5434/tumiki"

# Redis Configuration
REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REDIS_REST_TOKEN="local_dev_token_12345"

# NextAuth.js + Keycloak Configuration
AUTH_SECRET="generate-with-openssl-rand-base64-32"  # openssl rand -base64 32 で生成
AUTH_URL="https://local.tumiki.cloud:3000"
KEYCLOAK_ID="tumiki-manager"
KEYCLOAK_SECRET="tumiki-manager-secret-change-in-production"
KEYCLOAK_ISSUER="http://localhost:8443/realms/tumiki"

# Keycloak Admin API認証情報
KEYCLOAK_ADMIN_USERNAME="admin"
KEYCLOAK_ADMIN_PASSWORD="admin123"

# Next.js Configuration
NEXT_PUBLIC_APP_URL="https://local.tumiki.cloud:3000"
NEXT_PUBLIC_MCP_PROXY_URL="http://localhost:8080"

# Encryption Keys（開発環境用デフォルト値）
CACHE_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
REDIS_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
PRISMA_FIELD_ENCRYPTION_KEY=""
```

**重要：本番環境では必ず適切なキーを生成してください**

```bash
# AUTH_SECRETの生成
openssl rand -base64 32

# 暗号化キーの生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Dockerコンテナの起動

```bash
# PostgreSQL と Redis コンテナを起動
pnpm docker:up

# Keycloak コンテナを起動（初回は2-3分かかります）
pnpm keycloak:up
```

起動完了を確認：

```bash
# コンテナの状態確認
docker compose -f docker/compose.yaml ps
docker compose -f docker/keycloak/compose.yaml ps
```

### 5. データベースのセットアップ

```bash
# packages/db ディレクトリに移動
cd packages/db

# データベースマイグレーションを実行
pnpm db:deploy

# プロジェクトルートに戻る
cd ../..
```

### 6. 開発サーバーの起動

```bash
# すべてのアプリケーションを起動
pnpm dev
```

または個別に起動：

```bash
# Manager（Webアプリケーション）
cd apps/manager && pnpm dev

# MCP Proxy
cd apps/mcp-proxy && pnpm dev
```

## アクセス確認

セットアップが完了したら、以下のURLでアプリケーションにアクセスできます：

- **Manager（Webアプリケーション）**: https://local.tumiki.cloud:3000
- **MCP Proxy**: http://localhost:8080
- **Keycloak管理コンソール**: http://localhost:8443
  - ユーザー名: admin
  - パスワード: admin123

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照してください：

- [README.md](./README.md) - プロジェクト概要と開発コマンド
- [docs/guides/testing-environment.md](./docs/guides/testing-environment.md) - テスト環境の構築
- [docs/guides/mcp-server-setup.md](./docs/guides/mcp-server-setup.md) - MCPサーバーの追加方法
- [docs/auth/keycloak/](./docs/auth/keycloak/) - Keycloak認証の詳細
