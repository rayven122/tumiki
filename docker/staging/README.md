# Tumiki ステージング環境

GitHub Container Registry にパブリッシュされた本番イメージを使用したステージング環境です。

## アーキテクチャ

```
Internet
    │
    │ Cloudflare Tunnel
    ▼
┌─────────────────────────────────────┐
│ stg.tumiki.cloud        → Manager   │
│ mcp-stg.tumiki.cloud    → MCP Proxy │
│ auth-stg.tumiki.cloud   → Keycloak  │
└─────────────────────────────────────┘
    │
    │ Docker Network
    ▼
┌──────────┬──────────────┬──────────┐
│ Manager  │  MCP Proxy   │ Keycloak │
│  :8080   │    :8080     │  :8080   │
└────┬─────┴──────┬───────┴────┬─────┘
     │            │            │
     └────────────┴────────────┘
                  │
            PostgreSQL :5432
```

## 前提条件

- Docker & Docker Compose インストール済み
- Cloudflare アカウント（Tunnel 使用）
- GitHub Container Registry へのアクセス権限

## セットアップ手順

### 1. 環境変数の設定

```bash
cd docker/staging
cp .env.example .env
```

`.env` ファイルを編集して以下を設定:

```bash
# データベースパスワードを生成
DB_PASSWORD=$(openssl rand -base64 32)

# Keycloak 管理者パスワードを生成
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)

# Keycloak DB パスワードを生成
KEYCLOAK_DB_PASSWORD=$(openssl rand -base64 32)

# Prisma 暗号化キーを生成
PRISMA_FIELD_ENCRYPTION_KEY=k1.aesgcm256.$(openssl rand -base64 32)
```

### 2. Cloudflare Tunnel の作成

```bash
# cloudflared をインストール（未インストールの場合）
# macOS: brew install cloudflare/cloudflare/cloudflared
# Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Cloudflare にログイン
cloudflared tunnel login

# Tunnel を作成
cloudflared tunnel create tumiki-staging

# Tunnel ID と credentials.json のパスをメモ
# credentials.json を docker/staging/cloudflared/ にコピー
cp ~/.cloudflared/<tunnel-id>.json docker/staging/cloudflared/credentials.json
```

### 3. Cloudflare Tunnel 設定

```bash
# config.yaml を作成
cd docker/staging/cloudflared
cp config.yaml.example config.yaml

# <tunnel-id> を実際の Tunnel ID に置き換え
sed -i '' 's/<tunnel-id>/YOUR_TUNNEL_ID/' config.yaml
```

### 4. DNS レコードの追加

Cloudflare Dashboard で以下の CNAME レコードを追加:

| Type  | Name              | Target                      |
|-------|-------------------|-----------------------------|
| CNAME | stg.tumiki.cloud  | <tunnel-id>.cfargotunnel.com |
| CNAME | mcp-stg.tumiki.cloud | <tunnel-id>.cfargotunnel.com |
| CNAME | auth-stg.tumiki.cloud | <tunnel-id>.cfargotunnel.com |

または、`cloudflared` CLI で自動設定:

```bash
cloudflared tunnel route dns tumiki-staging stg.tumiki.cloud
cloudflared tunnel route dns tumiki-staging mcp-stg.tumiki.cloud
cloudflared tunnel route dns tumiki-staging auth-stg.tumiki.cloud
```

### 5. init-db.sql の編集

`init-db.sql` の `keycloak_placeholder` を `.env` の `KEYCLOAK_DB_PASSWORD` と同じ値に置き換え:

```bash
sed -i '' "s/keycloak_placeholder/${KEYCLOAK_DB_PASSWORD}/" init-db.sql
```

### 6. Docker Compose の起動

```bash
# イメージを最新に更新
docker compose pull

# コンテナを起動
docker compose up -d

# ログを確認
docker compose logs -f
```

### 7. データベースマイグレーション

```bash
# Manager コンテナでマイグレーション実行
docker compose exec manager sh -c "cd /app/packages/db && npx prisma migrate deploy"
```

### 8. Keycloak の初期設定

1. https://auth-stg.tumiki.cloud/admin にアクセス
2. `.env` の `KEYCLOAK_ADMIN_USERNAME` と `KEYCLOAK_ADMIN_PASSWORD` でログイン
3. Terraform で Realm とクライアントを設定（プロジェクトルートで実行）:

```bash
cd terraform/keycloak

# ステージング環境で初期化
terraform init -backend-config=cloud.staging.tf

# プラン確認
terraform plan -var-file=environments/staging.tfvars

# 適用
terraform apply -var-file=environments/staging.tfvars

# クライアントシークレットを出力
terraform output -raw manager_client_secret
```

4. Terraform が出力する `client_secret` を `.env` の `KEYCLOAK_CLIENT_SECRET` に設定
5. Manager を再起動:

```bash
cd ../../docker/staging
docker compose restart manager
```

### 9. 動作確認

```bash
# Manager ヘルスチェック
curl https://stg.tumiki.cloud/api/health

# MCP Proxy ヘルスチェック
curl https://mcp-stg.tumiki.cloud/health

# Keycloak ヘルスチェック
curl https://auth-stg.tumiki.cloud/health/ready
```

## 運用

### ログの確認

```bash
# すべてのサービスのログ
docker compose logs -f

# 特定のサービスのみ
docker compose logs -f manager
docker compose logs -f mcp-proxy
```

### イメージの更新

```bash
# 特定のタグを指定（.env で設定）
MANAGER_IMAGE_TAG=sha-abc1234 docker compose up -d manager

# または main ブランチの最新
docker compose pull manager mcp-proxy
docker compose up -d manager mcp-proxy
```

### データベースバックアップ

```bash
# バックアップ作成
docker compose exec db pg_dump -U tumiki tumiki > backup-$(date +%Y%m%d-%H%M%S).sql

# リストア
docker compose exec -T db psql -U tumiki tumiki < backup-20260315-120000.sql
```

### 停止と削除

```bash
# 停止
docker compose stop

# 停止して削除（データは保持）
docker compose down

# すべて削除（データも削除）
docker compose down -v
```

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker compose logs <service-name>

# ヘルスチェック状態を確認
docker compose ps
```

### データベース接続エラー

```bash
# DB の状態を確認
docker compose exec db pg_isready -U tumiki

# 接続テスト
docker compose exec manager sh -c "cd /app/packages/db && npx prisma db push"
```

### Cloudflare Tunnel が接続しない

```bash
# cloudflared のログを確認
docker compose logs cloudflared

# Tunnel の状態を確認
cloudflared tunnel info tumiki-staging
```

## セキュリティ

- ✅ すべての通信は Cloudflare Tunnel 経由で暗号化
- ✅ データベースは内部ネットワークのみアクセス可能
- ✅ 環境変数でシークレット管理（`.env` は `.gitignore` に追加）
- ✅ イメージは GitHub Container Registry から pull（検証済み）
- ⚠️ 定期的なバックアップを推奨
- ⚠️ ログのモニタリングを推奨

## 参考資料

- [Cloudflare Tunnel ドキュメント](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Docker Compose リファレンス](https://docs.docker.com/compose/compose-file/)
- [Next.js Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
