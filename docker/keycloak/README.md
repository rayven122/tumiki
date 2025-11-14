# Keycloak Docker環境

TumikiプラットフォームのOAuth認証基盤（ローカル開発用）

## pnpmコマンドでの起動

プロジェクトルートから以下のコマンドで起動できます：

```bash
# プロジェクトルートで実行
pnpm keycloak:up              # 起動
pnpm keycloak:stop            # 停止（データ保持）
pnpm keycloak:down            # 停止（コンテナ削除）
pnpm keycloak:down:volumes    # データ削除して停止
```

### 利用可能なコマンド一覧

| コマンド | 説明 |
|---------|------|
| `pnpm keycloak:up` | Keycloak環境を起動（DB含む） |
| `pnpm keycloak:stop` | Keycloakを停止（データ保持、再起動が速い） |
| `pnpm keycloak:down` | Keycloakを停止（コンテナ削除） |
| `pnpm keycloak:down:volumes` | Keycloakを停止してデータも削除 |

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

## 主な操作

### プロジェクトルートから実行

```bash
# 停止（データ保持）
pnpm keycloak:stop

# 停止（コンテナ削除）
pnpm keycloak:down

# データ削除して再起動
pnpm keycloak:down:volumes && pnpm keycloak:up
```

## カスタマイズ

`tumiki-realm.json` を編集してコンテナを再作成：

```bash
# プロジェクトルートから実行
pnpm keycloak:down:volumes && pnpm keycloak:up
```

## Manager App環境変数

```bash
KEYCLOAK_ISSUER=http://localhost:8443/realms/tumiki
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-manager-secret-change-in-production
```
