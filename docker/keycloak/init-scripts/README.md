# Keycloak セットアップスクリプト

## 必要な環境変数

### 必須

- `KEYCLOAK_ADMIN_USERNAME` - Keycloak管理者ユーザー名
- `KEYCLOAK_ADMIN_PASSWORD` - Keycloak管理者パスワード

### オプション

- `KEYCLOAK_URL` - Keycloak URL（デフォルト: `http://localhost:8080`）
- `KEYCLOAK_REALM` - Realm名（デフォルト: `tumiki`）
- `KEYCLOAK_CLIENT_ID` - Client名（デフォルト: `tumiki-manager`）
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID（設定する場合のみ）
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret（設定する場合のみ）

## セットアップ手順

### 1. 環境変数を.envファイルに設定

プロジェクトルートの `.env` ファイルに以下を設定：

```bash
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin123
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
```

### 2. セットアップ実行

セットアップスクリプトは Keycloak 起動時に自動実行されます：

```bash
# プロジェクトルートから実行
pnpm keycloak:up
```

**注意**: 以前のバージョンでは手動実行が必要でしたが、現在は `entrypoint.sh` により自動実行されるため、手動実行は不要です。

## 設定内容

### Tumiki カスタムクレーム

- `tumiki.org_id` - 組織ID（String）
- `tumiki.is_org_admin` - 組織管理者フラグ（Boolean）
- `tumiki.user_db_id` - ユーザーDB ID（String）

### Google IdP 属性マッパー（GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETが設定されている場合）

- `email` → `username`, `email`
- `given_name` → `firstName`
- `family_name` → `lastName`
- `email_verified` → `emailVerified`
- `picture` → `picture`

### カスタムブローカーログインフロー

Google IdP経由での初回ログイン時に、Keycloakの「Update Account Information」画面をスキップするため、カスタムの`tumiki-broker-login`フローを作成します：

- デフォルトの「first broker login」フローをコピー
- 「Review Profile」ステップを無効化（DISABLED）
- Review Profile の設定で `update.profile.on.first.login` を `off` に設定
- ユーザーは直接Tumikiアプリケーションの`/onboarding`画面に遷移
