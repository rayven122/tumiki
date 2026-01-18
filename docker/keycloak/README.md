# Keycloak Docker環境

TumikiプラットフォームのOAuth認証基盤（ローカル開発用）

## セットアップ（Terraform管理）

Keycloakの設定はTerraformで管理されています。初回セットアップは以下のコマンドで行います：

```bash
# 一括セットアップ（推奨）
pnpm setup:dev

# または個別に実行
pnpm docker:up          # Dockerコンテナ起動
pnpm keycloak:wait      # Keycloak起動完了を待機
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

### 管理コンソール
- URL: http://localhost:8443/admin/
- ユーザー名: `admin`
- パスワード: `admin123`

### Manager App用クライアント
- Client ID: `tumiki-manager`
- Client Secret: `tumiki-manager-secret-change-in-production`

### MCP Proxy用クライアント
- Client ID: `tumiki-proxy`
- Client Secret: `tumiki-proxy-secret-change-in-production`

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

## Terraform設定ファイル

設定ファイルは `terraform/keycloak/` に配置されています：

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

`terraform/keycloak/terraform.tfvars` を編集するか、環境変数で上書きできます：

```bash
# 環境変数で上書きする例
TF_VAR_keycloak_admin_password="new-password" pnpm keycloak:apply
```

### Google IdPの設定

Google OAuth認証を有効にするには、環境変数を設定します：

```bash
TF_VAR_google_client_id="your-client-id" \
TF_VAR_google_client_secret="your-client-secret" \
pnpm keycloak:apply
```

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

## トラブルシューティング

### Keycloakが起動しない場合

```bash
# ログを確認
docker compose -f docker/compose.yaml logs keycloak

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

## 前提条件

- Docker Desktop が起動していること
- Terraform CLI がインストールされていること
- Node.js >= 22.14.0
