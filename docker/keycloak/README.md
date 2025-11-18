# Keycloak Docker環境

TumikiプラットフォームのOAuth認証基盤（ローカル開発用）

以下が自動セットアップされます：
- Tumiki Realmの作成
- Manager App用OIDCクライアントの作成
- テストユーザーの作成
- カスタムクレーム設定（tumiki.org_id, tumiki.is_org_admin等）
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

```bash
KEYCLOAK_ISSUER=http://localhost:8443/realms/tumiki
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-manager-secret-change-in-production
```
