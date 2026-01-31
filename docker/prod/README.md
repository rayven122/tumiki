# Keycloak 本番環境デプロイガイド

このディレクトリには、さくらのクラウドにKeycloakをデプロイするための設定が含まれています。

## アーキテクチャ

```
インターネット
    │
    ▼
Cloudflare Tunnel
    │
    ▼ auth.tumiki.cloud
┌───────────────────────┐
│  tumiki-keycloak VM   │
│  ┌─────────────────┐  │
│  │     nginx       │  │ :8080
│  │  (CORS proxy)   │  │
│  └────────┬────────┘  │
│           │           │
│  ┌────────▼────────┐  │
│  │    Keycloak     │  │ :8080 (internal)
│  └────────┬────────┘  │
└───────────┼───────────┘
            │
    ┌───────▼───────┐
    │  PostgreSQL   │ 192.168.0.100:5432
    │ (tumiki-prod-db) │
    └───────────────┘
```

## 前提条件

1. **SSH接続設定**

   `~/.ssh/config` に以下を追加:

   ```
   Host tumiki-keycloak
     HostName <keycloak-vm-ip>
     User tumiki
     IdentityFile ~/.ssh/id_rsa

   Host tumiki-prod-db
     HostName <db-vm-ip>
     User tumiki
     IdentityFile ~/.ssh/id_rsa
   ```

2. **Cloudflare Tunnel設定済み**
   - `auth.tumiki.cloud` → `192.168.0.90:8080`

3. **PostgreSQL準備済み**
   - ホスト: `192.168.0.100`
   - Keycloak用データベース作成

## デプロイ手順

### 1. 環境変数設定

```bash
cd docker/prod
cp .env.example .env
# .envファイルを編集して認証情報を設定
```

### 2. インフラセットアップ

```bash
# PostgreSQL接続確認・DB作成
pnpm keycloak:prod:setup-db

# Dockerインストール（Keycloak VM）
pnpm keycloak:prod:setup
```

### 3. Keycloakデプロイ

```bash
# コンテナ起動
pnpm keycloak:prod:deploy

# ステータス確認
pnpm keycloak:prod:status
```

### 4. Terraform設定適用

```bash
# 変更プレビュー
pnpm keycloak:prod:plan

# 設定適用（レルム、クライアント、スコープ等）
pnpm keycloak:prod:apply
```

## 管理コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm keycloak:prod:status` | ステータス確認 |
| `pnpm keycloak:prod:logs` | ログ表示 |
| `pnpm keycloak:prod:restart` | サービス再起動 |
| `pnpm keycloak:prod:shell` | SSH接続 |

## Terraform連携

本番環境のKeycloak設定は`terraform/keycloak/`で管理されています。

- **ローカル環境**: `terraform.tfvars` を使用
- **本番環境**: `terraform.tfvars.production` を使用

本番環境への適用:
```bash
# 変更プレビュー
pnpm keycloak:prod:plan

# 設定適用
pnpm keycloak:prod:apply
```

### 本番用変数ファイル

`terraform/keycloak/terraform.tfvars.production`:
```hcl
keycloak_url = "https://auth.tumiki.cloud"
realm_name = "tumiki"

manager_redirect_uris = [
  "https://manager.tumiki.cloud/*",
  "https://tumiki-*.vercel.app/*"
]

manager_web_origins = [
  "https://manager.tumiki.cloud",
  "https://tumiki-*.vercel.app"
]
```

## トラブルシューティング

### Keycloakが起動しない

```bash
# ログ確認
pnpm keycloak:prod:logs

# DB接続確認
pnpm keycloak:prod:setup-db
```

### Terraform適用エラー

```bash
# Keycloakが稼働していることを確認
pnpm keycloak:prod:status

# 再初期化が必要な場合
pnpm keycloak:init
pnpm keycloak:prod:apply
```

### CORS エラー

1. nginxコンテナが稼働していることを確認
2. `docker/prod/nginx/nginx.conf` の `Access-Control-Allow-Origin` を確認
3. コンテナ再起動: `pnpm keycloak:prod:restart`

## セキュリティ

- 管理者パスワードは強力なものを使用
- `.env` ファイルはGit管理対象外（`.gitignore`に追加済み）
- SSHキー認証のみ使用（パスワード認証は無効化）
- Cloudflare Tunnelでエンドツーエンド暗号化
