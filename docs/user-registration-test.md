# 新規ユーザー登録機能のテスト手順

## 概要

このドキュメントは、Keycloak + NextAuth.js v5での新規ユーザー登録機能が正しく動作することを確認するための手順です。

## 前提条件

- ✅ Keycloakコンテナが起動している（`docker ps | grep keycloak`で確認）
- ✅ Next.jsアプリケーションが起動している（`https://local.tumiki.cloud:3000`）
- ✅ `registrationAllowed: true`がKeycloak realm設定で有効化されている

## テストシナリオ

### シナリオ1: Keycloak Admin APIでユーザーを作成（完了）

**結果**: ✅ 成功

作成されたテストユーザー:
- **Email**: `test-1762237545@tumiki.test`
- **Password**: `Test1234!`
- **状態**: Keycloakに登録済み、まだTumikiデータベースには未登録

### シナリオ2: ブラウザでログインしてNextAuth.jsの動作を確認

#### 手順

1. **ブラウザで未認証ページにアクセス**
   ```
   https://local.tumiki.cloud:3000/mcp
   ```

2. **自動的にKeycloakログインページにリダイレクトされる**
   - NextAuth.jsのミドルウェアが未認証を検知
   - Keycloakの認証エンドポイントにリダイレクト

3. **テストユーザーでログイン**
   - Username: `test-1762237545@tumiki.test`
   - Password: `Test1234!`

4. **ログイン成功後、Tumikiアプリケーションにリダイレクトされる**

5. **NextAuth.js Prisma Adapterが以下を自動実行**:
   - `User`テーブルにレコード作成
   - `Account`テーブルにKeycloak認証情報を保存
   - `Session`テーブルにセッション作成

### シナリオ3: 新規ユーザー登録フローのテスト

#### 手順

1. **登録ページにアクセス**

   **方法1**: 自動リダイレクトから登録
   - 未認証状態で`https://local.tumiki.cloud:3000`にアクセス
   - Keycloakログインページが表示される
   - ページ下部の **「Register」** リンクをクリック

   **方法2**: 直接アクセス
   ```
   http://localhost:8443/realms/tumiki/protocol/openid-connect/registrations?client_id=tumiki-manager&response_type=code&scope=openid%20email%20profile&redirect_uri=http://localhost:3000/api/auth/callback/keycloak
   ```

2. **ユーザー情報を入力**
   - Email: あなたのメールアドレス
   - First name: テスト
   - Last name: ユーザー
   - Username: （自動入力される - emailと同じ）
   - Password: 強力なパスワード（例: SecurePass123!）
   - Password confirmation: 同じパスワードを再入力

3. **「Register」ボタンをクリック**

4. **メール検証（`verifyEmail: true`の場合）**
   - Keycloakから確認メールが送信される
   - ⚠️ 開発環境ではメールサーバーが設定されていない場合、この手順はスキップされる可能性があります

5. **初回ログイン**
   - 登録後、自動的にログインページにリダイレクト
   - 作成したメールアドレスとパスワードでログイン

6. **NextAuth.jsの自動ユーザー作成**
   - 初回ログイン時に`apps/manager/src/auth.ts:34-78`の`createUser`が呼ばれる
   - Tumikiデータベースに以下が作成される:
     - `User`テーブル: 基本ユーザー情報
     - `Account`テーブル: Keycloak連携情報
     - `Session`テーブル: セッション情報

## データベース確認

### 方法1: Prisma Studio（推奨）

```bash
cd /Users/hisuzuya/Documents/app/rayven/tumiki-main/packages/db
pnpm db:studio
```

ブラウザで`http://localhost:5555`を開いて確認:
- `User`テーブル: 新規ユーザーが存在するか
- `Account`テーブル: `provider = "keycloak"`のレコードが存在するか
- `Session`テーブル: アクティブなセッションが存在するか

### 方法2: SQL（環境変数が設定されている場合）

```bash
# ユーザー数確認
cd /Users/hisuzuya/Documents/app/rayven/tumiki-main/packages/db
pnpm with-env -- npx prisma db execute --stdin << EOF
SELECT COUNT(*) as user_count FROM "User";
EOF

# 最新のユーザー確認
pnpm with-env -- npx prisma db execute --stdin << EOF
SELECT id, email, name, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 5;
EOF

# Accountテーブル確認
pnpm with-env -- npx prisma db execute --stdin << EOF
SELECT "userId", provider, "providerAccountId", "createdAt" FROM "Account" ORDER BY "createdAt" DESC LIMIT 5;
EOF
```

## 期待される結果

### ログイン成功時

- ✅ Tumikiアプリケーションのダッシュボードが表示される
- ✅ ヘッダーにユーザー名/メールアドレスが表示される
- ✅ `/profile`ページでユーザー情報が確認できる

### データベース

**Userテーブル**:
```sql
id: <Keycloakのsub ID>
email: "test-1762237545@tumiki.test"
name: "Test User"
emailVerified: <DateTime or null>
```

**Accountテーブル**:
```sql
userId: <上記のUser.id>
provider: "keycloak"
providerAccountId: <Keycloakのuser ID>
type: "oauth"
```

**Sessionテーブル**:
```sql
userId: <User.id>
sessionToken: <ランダムな文字列>
expires: <30日後の日時>
```

## トラブルシューティング

### 問題: "Email is required" エラーが発生する

**原因**: Keycloakがemailスコープを提供していない

**解決方法**:
1. Keycloak Admin Console (`http://localhost:8443/admin`) にログイン
2. `tumiki` realm → Clients → `tumiki-manager` を選択
3. Client Scopes タブを確認
4. `email`スコープが含まれているか確認

### 問題: ログイン後、データベースにUserレコードが作成されない

**原因**: NextAuth.jsのPrisma Adapterが正しく動作していない

**確認事項**:
1. `apps/manager/src/auth.ts`の`createUser`メソッドにブレークポイントを設定
2. コンソールログを確認: `[Auth] Failed to create user:` のようなエラーメッセージ
3. DATABASE_URL環境変数が正しく設定されているか確認

### 問題: メール検証がスキップされる

**原因**: Keycloakのメールサーバー設定が未完了

**開発環境での対処**:

**方法1**: メール検証を無効化（開発時のみ推奨）
```json
// docker/keycloak/tumiki-realm.json
{
  "verifyEmail": false
}
```

**方法2**: MailHogを使用（メール確認が必要な場合）
```bash
# MailHog起動
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Keycloak Admin Console → Realm Settings → Email
# Host: host.docker.internal
# Port: 1025
# From: noreply@tumiki.cloud
```

メール確認: `http://localhost:8025`

## 成功基準

以下のすべてが確認できた場合、新規ユーザー登録機能は正常に動作しています:

- [x] Keycloakで新規ユーザーを作成できる
- [x] 作成したユーザーでログインできる
- [x] ログイン後、Tumikiアプリケーションにリダイレクトされる
- [x] `User`テーブルに新規レコードが作成される
- [x] `Account`テーブルにKeycloak連携情報が保存される
- [x] `Session`テーブルにセッション情報が作成される
- [x] セッションが維持される（ページリロード後も）
- [x] ログアウトできる

## 次のステップ

1. **本番環境の準備**
   - Keycloakサーバーの本番デプロイ
   - メールサーバーの設定（SendGrid, AWS SES等）
   - SSL/TLS証明書の設定

2. **ユーザーエクスペリエンスの改善**
   - Keycloakログイン画面のカスタマイズ（テーマ適用）
   - エラーメッセージの日本語化
   - パスワードポリシーの設定

3. **セキュリティ強化**
   - 多要素認証（MFA）の実装
   - ソーシャルログイン（Google, GitHub等）の追加
   - セッション管理の最適化（Redis導入検討）

## 参考情報

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Prisma Adapter for Auth.js](https://authjs.dev/reference/adapter/prisma)
- [Auth0からKeycloakへの移行ガイド](./auth0-to-keycloak-migration.md)
