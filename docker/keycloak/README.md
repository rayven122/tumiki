# Keycloak Docker環境

TumikiプラットフォームのOAuth認証基盤（ローカル開発用）

以下が自動セットアップされます：
- Tumiki Realmの作成
- Manager App用OIDCクライアントの作成
- テストユーザーの作成
- カスタムクレーム設定
  - `tumiki.organization_id` - 現在の組織DB ID
  - `tumiki.organization_group` - Keycloakグループ名
  - `tumiki.roles` - 組織内ロール配列
  - `tumiki.is_keycloak_managed` - Keycloak管理フラグ
- 組織管理用Realm Roles
  - `Owner` - 全権限
  - `Admin` - メンバー管理可能
  - `Member` - 基本利用
  - `Viewer` - 読み取り専用
- Google IdP設定（環境変数設定時）

## 認証情報

### 管理コンソール
- URL: http://localhost:8443/admin/
- ユーザー名: `admin`
- パスワード: `admin123`

### Manager App用クライアント
- Client ID: `tumiki-manager`
- Client Secret: `tumiki-manager-secret-change-in-production`

### テストユーザー
- Email: `admin@tumiki.local`
- パスワード: `admin123`

## カスタマイズ

`tumiki-realm.json` を編集してコンテナを再作成してください。

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
