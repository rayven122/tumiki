# Keycloak Terraform設定

TumikiプラットフォームのOAuth認証基盤（ローカル開発用）

## 前提条件

- Docker Desktop が起動していること
- Terraform CLI がインストールされていること
- Node.js >= 22.14.0
- direnv がインストールされていること（`.env` の自動読み込みに使用）

## セットアップ

Keycloakの設定はTerraformで管理されています。

### 1. 環境変数の設定

`.env` ファイルに以下の変数を設定します（`.env.example` を参照）：

```bash
# 必須: Keycloak管理者認証情報
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin123

# 必須: Manager Appクライアント設定
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-manager-secret-change-in-production

# 任意: Google OAuth設定（空の場合はGoogle IdPを設定しない）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 2. 初回セットアップ

```bash
# 一括セットアップ（推奨）
pnpm setup:dev

# または個別に実行
pnpm docker:up          # Dockerコンテナ起動
pnpm keycloak:wait      # Keycloak起動完了を待機
pnpm keycloak:dev-init  # masterレルムの開発用設定
pnpm keycloak:init      # Terraform初期化
pnpm keycloak:apply     # Keycloak設定を適用
```

## 自動設定される内容

Terraformにより以下が自動セットアップされます：

- **Tumiki Realm**の作成
- **Manager App用OIDCクライアント**の作成
- **MCP Proxy用OIDCクライアント**の作成
- **テストユーザー**の作成
- **カスタムクレーム設定**
  - `tumiki.org_id` - 組織ID
  - `tumiki.is_org_admin` - 組織管理者フラグ
  - `tumiki.tumiki_user_id` - TumikiユーザーID
  - `tumiki.default_organization_id` - デフォルト組織ID
- **組織管理用Realm Roles**
  - `Owner` - 全権限
  - `Admin` - メンバー管理可能
  - `Member` - 基本利用
  - `Viewer` - 読み取り専用
- **Google IdP設定**（環境変数設定時のみ）

## 認証情報

認証情報は `.env` ファイルから読み込まれます。以下はデフォルト値です。

### 管理コンソール
- URL: http://localhost:8888/admin/
- ユーザー名: `.env` の `KEYCLOAK_ADMIN_USERNAME`（デフォルト: `admin`）
- パスワード: `.env` の `KEYCLOAK_ADMIN_PASSWORD`（デフォルト: `admin123`）

### Manager App用クライアント
- Client ID: `.env` の `KEYCLOAK_CLIENT_ID`（デフォルト: `tumiki-manager`）
- Client Secret: `.env` の `KEYCLOAK_CLIENT_SECRET`

### MCP Proxy用クライアント
- Client ID: `tumiki-proxy`（terraform.tfvars で設定）
- Client Secret: `tumiki-proxy-secret-change-in-production`（terraform.tfvars で設定）

### テストユーザー
- Email: `admin@tumiki.local`
- パスワード: `admin123`

## Terraformコマンド

```bash
# Terraform初期化
pnpm keycloak:init

# 設定変更のプレビュー
pnpm keycloak:plan

# 設定を適用
pnpm keycloak:apply

# 設定を削除（Realmを削除）
pnpm keycloak:destroy
```

## ファイル構成

```
terraform/keycloak/
├── main.tf              # プロバイダー設定
├── variables.tf         # 変数定義
├── terraform.tfvars     # 開発環境デフォルト値
├── outputs.tf           # 出力値
├── realm.tf             # Realm設定
├── clients.tf           # クライアント設定
├── client-scopes.tf     # クライアントスコープ
├── protocol-mappers.tf  # プロトコルマッパー
├── roles.tf             # Realm Roles
├── users.tf             # テストユーザー
└── identity-providers.tf # Google IdP（オプション）
```

## カスタマイズ

### 変数の上書き

認証情報は `.env` ファイルで管理され、`scripts/keycloak.sh` により `TF_VAR_*` 形式に変換されます。

| .env 変数 | Terraform変数 | 必須 |
|-----------|---------------|------|
| `KEYCLOAK_ADMIN_USERNAME` | `keycloak_admin_username` | ✅ |
| `KEYCLOAK_ADMIN_PASSWORD` | `keycloak_admin_password` | ✅ |
| `KEYCLOAK_CLIENT_ID` | `manager_client_id` | ✅ |
| `KEYCLOAK_CLIENT_SECRET` | `manager_client_secret` | ✅ |
| `GOOGLE_CLIENT_ID` | `google_client_id` | - |
| `GOOGLE_CLIENT_SECRET` | `google_client_secret` | - |

その他の設定は `terraform.tfvars` で編集できます。

### Google IdPの設定

Google OAuth認証を有効にするには、`.env` に設定を追加します：

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

その後、`pnpm keycloak:apply` を実行します。

## Manager App環境変数

### 認証クライアント設定

```bash
KEYCLOAK_ISSUER=http://localhost:8443/realms/tumiki
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-manager-secret-change-in-production
```

### Admin API設定（組織管理用）

```bash
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin123
ORGANIZATION_PROVIDER=keycloak  # デフォルト値、省略可能
```

## Dynamic Client Registration（DCR）

mcp-proxy は DCR リクエストを Keycloak にプロキシします。追加設定は不要です。

詳細は [DCR 設定ガイド](../../docs/auth/keycloak-dcr-setup.md) を参照してください。

## 本番環境デプロイ

本番環境（さくらのクラウド）へのデプロイ手順。

### 前提条件

- さくらのクラウドVMへのSSHアクセス（`~/.ssh/config`設定済み）
- Cloudflare Tunnel設定済み（auth.tumiki.cloud → `<keycloak-vm-ip>:8080`）
- PostgreSQL (`<db-server-ip>`) 準備済み

### 環境変数ファイル

- `terraform.tfvars` - ローカル開発環境用
- `terraform.tfvars.production` - 本番環境用

### デプロイ手順

```bash
# 1. 環境変数設定
cd docker/prod
cp .env.example .env
# .envファイルを編集

# 2. インフラセットアップ
pnpm keycloak:prod:setup-db   # DB接続確認
pnpm keycloak:prod:setup      # Dockerインストール

# 3. Keycloakデプロイ
pnpm keycloak:prod:deploy     # コンテナ起動

# 4. Terraform設定適用
pnpm keycloak:prod:apply      # 本番設定適用
```

### 本番用コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm keycloak:prod:plan` | 変更プレビュー |
| `pnpm keycloak:prod:apply` | 設定適用 |
| `pnpm keycloak:prod:status` | ステータス確認 |
| `pnpm keycloak:prod:logs` | ログ表示 |
| `pnpm keycloak:prod:restart` | 再起動 |

詳細は [docker/prod/README.md](../../docker/prod/README.md) を参照。

## トラブルシューティング

### Keycloakが起動しない場合

```bash
# ログを確認
docker compose -f docker/local/compose.yaml logs keycloak

# コンテナを再起動
pnpm docker:down
pnpm docker:up
```

### Terraform適用が失敗する場合

```bash
# Keycloakの起動を待機
pnpm keycloak:wait

# 再度適用
pnpm keycloak:apply
```

### 設定をリセットしたい場合

```bash
# Keycloakコンテナを削除して再作成
pnpm docker:down
docker volume rm docker_db_vol  # 必要に応じてDBも削除
pnpm setup:dev
```