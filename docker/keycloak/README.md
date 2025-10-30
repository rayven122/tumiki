# Keycloak Docker環境

TumikiプラットフォームのOAuth認証基盤（ローカル開発用）

## クイックスタート

```bash
cd docker/keycloak
docker compose up -d
```

これだけで以下が自動セットアップされます：
- ✅ Tumiki Realmの作成
- ✅ Manager App用OIDCクライアントの作成
- ✅ テストユーザーの作成

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

## 主な操作

```bash
# 停止
docker compose down

# データ削除して再起動
docker compose down -v && docker compose up -d

# ログ確認
docker compose logs -f keycloak
```

## カスタマイズ

`tumiki-realm.json` を編集してコンテナを再作成：

```bash
docker compose down -v
docker compose up -d
```

## Manager App環境変数

```bash
KEYCLOAK_ISSUER=http://localhost:8443/realms/tumiki
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-manager-secret-change-in-production
```
