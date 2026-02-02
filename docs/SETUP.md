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

`.env`ファイルを編集して以下の必須環境変数を設定します。詳細は [環境変数リファレンス](./docs/environment-variables.md) を参照してください。

#### 🔴 必須環境変数

```bash
# データベース設定
DATABASE_URL="postgresql://root:password@localhost:5434/tumiki"

# Redis設定
REDIS_URL="redis://localhost:6379"
REDIS_ENCRYPTION_KEY="生成したキー"  # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Keycloak認証設定
KEYCLOAK_CLIENT_ID="tumiki-manager"
KEYCLOAK_CLIENT_SECRET="tumiki-manager-secret-change-in-production"
KEYCLOAK_ISSUER="http://localhost:8443/realms/tumiki"
KEYCLOAK_ADMIN_USERNAME="admin"
KEYCLOAK_ADMIN_PASSWORD="admin123"

# Google OAuth設定（Keycloak起動時に必要）
# Google Cloud Consoleで OAuth 2.0 クライアントIDを作成して取得
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Auth.js設定
NEXTAUTH_SECRET="生成したキー"  # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# MCP Proxy設定
NEXT_PUBLIC_MCP_PROXY_URL="http://localhost:8080"

# Prismaフィールド暗号化設定
PRISMA_FIELD_ENCRYPTION_KEY="生成したキー"  # pnpm dlx @47ng/cloak generate
PRISMA_FIELD_ENCRYPTION_HASH_SALT="生成したキー"  # openssl rand -base64 32
```

#### 🟢 任意環境変数（機能を有効化する場合に必要）

```bash
# キャッシュ設定
CACHE_TTL="300"  # キャッシュの有効期限（秒）

# メール送信設定（SMTP）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="info@tumiki.cloud"

# MicroCMS設定
MICROCMS_TUMIKI_BLOG_API_KEY="your-api-key"
MICROCMS_TUMIKI_BLOG_SERVICE_DOMAIN="tumiki"

# メンテナンスモード設定
MAINTENANCE_MODE="false"
MAINTENANCE_ALLOWED_IPS="192.168.1.1,10.0.0.1"
NEXT_PUBLIC_MAINTENANCE_END_TIME="2025-01-11T03:00:00Z"

# 開発・デバッグ設定
LOG_LEVEL="info"  # debug, info, warn, error
DEBUG_MULTITENANCY="false"
```

**重要：本番環境では必ず適切なキーを生成してください**

```bash
# NEXTAUTH_SECRETの生成
openssl rand -base64 32

# REDIS_ENCRYPTION_KEYの生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PRISMA_FIELD_ENCRYPTION_KEYの生成
pnpm dlx @47ng/cloak generate

# PRISMA_FIELD_ENCRYPTION_HASH_SALTの生成
openssl rand -base64 32
```

### 4. Dockerコンテナの起動

```bash
# PostgreSQL、Redis、Keycloak コンテナを起動（初回は2-3分かかります）
pnpm docker:up
```

起動完了を確認：

```bash
# コンテナの状態確認
docker compose -f docker/compose.yaml ps
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

### 6. MCPサーバーテンプレートとツールの初期データ投入

```bash
# packages/script ディレクトリに移動
cd packages/script

# MCPサーバーテンプレートとツールの初期データを投入
pnpm upsertAll

# プロジェクトルートに戻る
cd ../..
```

このコマンドにより、以下のデータがデータベースに登録されます：

- MCPサーバーテンプレート（各MCPサーバーの定義）
- MCPツール（各サーバーが提供するツールの情報）

### 7. 開発サーバーの起動

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

- **Manager（Webアプリケーション）**: http://localhost:3000
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
