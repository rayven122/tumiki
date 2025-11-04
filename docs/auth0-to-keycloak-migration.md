# Auth0からKeycloakへの移行ガイド

## 概要

このドキュメントは、TumikiプロジェクトでAuth0からKeycloakへ認証システムを移行する際の詳細な手順を記載しています。

## ⚠️ 重要な注意事項

### セキュリティ上の制約

現在の実装では、Database strategyを使用しているため、Edge Runtimeで動作するmiddlewareでセッションの内容を検証できません。

- **Middleware**: セッショントークンクッキーの存在のみをチェック
- **実際の検証**: 各ルート（API routes、Server Components）で`auth()`を呼び出す際に実行

**影響**: 悪意のあるユーザーが偽のクッキーを設定できる可能性がありますが、実際のデータアクセスは各ルートでの検証で保護されます。

**今後の改善案**:
- JWT strategyへの移行（Edge Runtimeでの検証が可能）
- セッションIDの署名検証を追加（HMAC等）

### データの互換性

- Auth0の`sub`とKeycloakの`sub`は異なるIDです
- 既存ユーザーは移行後、新しいアカウントとして扱われます

## 前提条件

1. **Keycloakの準備**
   - Keycloakサーバーが起動していること
   - Tumiki用のRealmが作成されていること
   - Client設定が完了していること（Client ID, Secret, Redirect URIs等）

2. **環境変数の準備**
   ```bash
   # 新しい環境変数
   KEYCLOAK_ID=tumiki-manager
   KEYCLOAK_SECRET=your-keycloak-client-secret
   KEYCLOAK_ISSUER=http://localhost:8443/realms/tumiki
   AUTH_SECRET=generate-with-openssl-rand-base64-32
   AUTH_URL=https://local.tumiki.cloud:3000
   ```

3. **バックアップ**
   - 本番データベースの完全バックアップ
   - Auth0設定のエクスポート
   - 現在の環境変数のバックアップ

## マイグレーション手順

### フェーズ1: データベース準備

#### 1.1 データベースバックアップ

```bash
# PostgreSQLのバックアップ
pg_dump $DATABASE_URL > backup_before_keycloak_migration_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2 スキーマ更新

```bash
cd packages/db
pnpm db:push
```

以下のテーブルが追加されます：
- `Account` - OAuth プロバイダー情報
- `Session` - セッション情報
- `VerificationToken` - メール検証トークン

#### 1.3 既存データの確認

```sql
-- 既存ユーザー数の確認
SELECT COUNT(*) FROM "User";

-- 既存ユーザーのemail確認（必須フィールド）
SELECT id, email, name FROM "User" WHERE email IS NULL;
```

⚠️ **重要**: emailがNULLのユーザーが存在する場合、移行前に修正が必要です。

### フェーズ2: アプリケーション移行

#### 2.1 依存パッケージの更新

```bash
pnpm install
```

#### 2.2 環境変数の更新

`.env`ファイルを更新：

```bash
# Auth0の設定をコメントアウト
# AUTH0_SECRET="..."
# AUTH0_BASE_URL="..."
# AUTH0_ISSUER_BASE_URL="..."
# AUTH0_CLIENT_ID="..."
# AUTH0_CLIENT_SECRET="..."

# Keycloakの設定を追加
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="https://local.tumiki.cloud:3000"
KEYCLOAK_ID="tumiki-manager"
KEYCLOAK_SECRET="your-keycloak-client-secret"
KEYCLOAK_ISSUER="http://localhost:8443/realms/tumiki"
```

#### 2.3 ビルドと型チェック

```bash
# 型チェック
pnpm typecheck

# ビルド
pnpm build

# テスト実行
pnpm test
```

すべてのコマンドが成功することを確認してください。

### フェーズ3: 動作確認

#### 3.1 基本的な認証フロー

- [ ] 未認証状態でログインページにリダイレクトされる
- [ ] Keycloakログイン画面が表示される
- [ ] 認証成功後、元のページにリダイレクトされる
- [ ] セッションが維持される（ページリロード後も）

#### 3.2 セッション管理

- [ ] ログアウト機能が動作する
- [ ] セッション期限切れ時に再認証が求められる
- [ ] 複数タブでセッションが共有される

#### 3.3 API認証

- [ ] 保護されたAPIルートにアクセスできる
- [ ] tRPC経由でセッション情報を取得できる
- [ ] 組織情報が正しく取得できる

#### 3.4 データベース確認

```sql
-- 新しいAccountレコードが作成されているか
SELECT * FROM "Account" ORDER BY "createdAt" DESC LIMIT 5;

-- 新しいSessionレコードが作成されているか
SELECT * FROM "Session" ORDER BY "expires" DESC LIMIT 5;

-- Userレコードが正しく作成されているか
SELECT id, email, name, image FROM "User" ORDER BY "createdAt" DESC LIMIT 5;
```

#### 3.5 新規ユーザー登録機能の確認

Keycloak設定で**ユーザー登録が有効化**されているため、新規ユーザーは以下の方法で登録できます。

##### 登録ページへのアクセス方法

1. **自動リダイレクト（推奨）**
   - 未認証状態でTumikiアプリケーション（`https://local.tumiki.cloud:3000`）にアクセス
   - NextAuth.jsが自動的にKeycloakログインページにリダイレクト
   - Keycloakログインページの下部に「Register」リンクが表示される

2. **直接アクセス**
   - 開発環境: `http://localhost:8443/realms/tumiki/protocol/openid-connect/registrations?client_id=tumiki-manager&redirect_uri=https://local.tumiki.cloud:3000`
   - 本番環境: Keycloakサーバーの設定に応じて適切なURLを使用

##### 登録フロー

1. **ユーザー情報の入力**
   - メールアドレス（必須）
   - パスワード（必須）
   - 名前（オプション）

2. **メール検証**
   - `verifyEmail: true` が有効化されているため、登録後に確認メールが送信される
   - ユーザーはメール内のリンクをクリックしてメールアドレスを検証

3. **自動ユーザー作成**
   - 初回ログイン時に `apps/manager/src/auth.ts:34-78` の `createUser` メソッドが呼ばれる
   - Keycloakの`sub` IDを使用してUserテーブルにレコードが作成される
   - メールアドレスが必須フィールドとして検証される

##### 動作確認項目

- [ ] 未認証状態でKeycloak登録ページが表示される
- [ ] 新規ユーザー情報を入力して登録できる
- [ ] メール検証が機能する（開発環境ではメールサーバー設定が必要）
- [ ] 登録後、初回ログインでUserテーブルにレコードが作成される
- [ ] Accountテーブルに認証情報が保存される
- [ ] Sessionテーブルにセッションが作成される

##### 開発環境でのメール設定（オプション）

メール検証を開発環境でテストする場合、Keycloakのメールサーバー設定が必要です：

1. Keycloak Admin Console（`http://localhost:8443/admin`）にログイン
2. Realm Settings → Email タブを選択
3. SMTP設定を入力（MailHog等のローカルメールサーバーを推奨）

**MailHogの使用例**:
```bash
# MailHogをDockerで起動
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Keycloak Email設定
# Host: host.docker.internal (Dockerコンテナから)
# Port: 1025
# From: noreply@tumiki.cloud
# Enable SSL: No
# Enable Auth: No
```

メール確認は `http://localhost:8025` でアクセス可能。

##### 注意事項

⚠️ **メール検証を無効化する場合**

開発環境でメール検証をスキップしたい場合：

```json
// docker/keycloak/tumiki-realm.json
{
  "verifyEmail": false  // メール検証を無効化
}
```

変更後、Keycloakコンテナを再起動：
```bash
cd docker/keycloak
docker compose down -v  # データも削除
docker compose up -d
```

### フェーズ4: 本番環境へのデプロイ

#### 4.1 段階的ロールアウト（推奨）

1. **カナリアデプロイ**: 一部のユーザーのみKeycloak認証を使用
2. **モニタリング**: エラーログ、認証成功率、レスポンスタイムを監視
3. **段階的拡大**: 問題がなければ徐々に対象ユーザーを拡大
4. **完全移行**: すべてのユーザーをKeycloak認証に移行

#### 4.2 ユーザーへの通知

移行前にユーザーに以下を通知：

1. 認証システムの変更について
2. 既存セッションが無効になること
3. 再ログインが必要なこと
4. 問題が発生した場合の連絡先

## ユーザーデータの移行

### Auth0ユーザーとKeycloakユーザーの紐付け

現在の実装では、Auth0の`sub`とKeycloakの`sub`が異なるため、既存ユーザーは新しいアカウントとして扱われます。

#### オプション1: メールアドレスでの紐付け（推奨）

既存のAuth0ユーザーとKeycloakユーザーを同じメールアドレスで紐付ける場合：

```typescript
// apps/manager/src/auth.ts の createUser を修正

createUser: async (user) => {
  try {
    const userId = user.id || crypto.randomUUID();

    if (!user.email) {
      throw new Error("Email is required for user creation.");
    }

    // 既存ユーザーをメールアドレスで検索
    const existingUser = await db.user.findUnique({
      where: { email: user.email },
    });

    if (existingUser) {
      // 既存ユーザーが見つかった場合、そのユーザーを返す
      console.log(`[Auth] Found existing user by email: ${user.email}`);
      return {
        id: existingUser.id,
        email: existingUser.email!,
        emailVerified: existingUser.emailVerified,
        name: existingUser.name,
        image: existingUser.image,
      };
    }

    // 新規ユーザーを作成
    const createdUser = await db.user.create({
      data: {
        id: userId,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      },
    });

    if (!createdUser.email) {
      throw new Error("User was created but email is null in database.");
    }

    return {
      id: createdUser.id,
      email: createdUser.email,
      emailVerified: createdUser.emailVerified,
      name: createdUser.name,
      image: createdUser.image,
    };
  } catch (error) {
    console.error("[Auth] Failed to create user:", error);
    throw error instanceof Error ? error : new Error("User creation failed");
  }
},
```

#### オプション2: マイグレーションスクリプト

Auth0からKeycloakにユーザーを一括移行する場合：

```bash
# マイグレーションスクリプトの作成
# packages/db/src/scripts/migrate-auth0-to-keycloak.ts
```

詳細はプロジェクトの要件に応じて実装してください。

## ロールバック手順

問題が発生した場合のロールバック手順：

### 1. アプリケーションのロールバック

```bash
# 前のバージョンにデプロイ
git revert <commit-hash>
pnpm deploy
```

### 2. 環境変数の復元

```bash
# Auth0の設定を復元
AUTH0_SECRET="..."
AUTH0_BASE_URL="..."
AUTH0_ISSUER_BASE_URL="..."
AUTH0_CLIENT_ID="..."
AUTH0_CLIENT_SECRET="..."

# Keycloakの設定をコメントアウト
# KEYCLOAK_ID="..."
# KEYCLOAK_SECRET="..."
# KEYCLOAK_ISSUER="..."
```

### 3. データベースのロールバック（必要な場合）

```bash
# バックアップから復元
psql $DATABASE_URL < backup_before_keycloak_migration_YYYYMMDD_HHMMSS.sql
```

⚠️ **注意**: Session, Account テーブルのデータは失われます。

## トラブルシューティング

### 問題: ログインできない

**原因**:
- Keycloakの設定ミス
- 環境変数の設定ミス
- セッションクッキーの問題

**解決方法**:
```bash
# ログを確認
tail -f logs/error.log

# Keycloak設定を確認
curl $KEYCLOAK_ISSUER/.well-known/openid-configuration

# クッキーを削除して再試行
# ブラウザの開発者ツールでクッキーをクリア
```

### 問題: "Email is required" エラー

**原因**: Keycloakからemailが提供されていない

**解決方法**:
1. Keycloak Admin Consoleで該当Clientを開く
2. "Client Scopes" → "Dedicated Scopes" を確認
3. "email" scopeが含まれているか確認
4. 必要に応じて "email" scopeを追加

### 問題: セッションが維持されない

**原因**:
- クッキーの設定ミス
- セッションストレージの問題

**解決方法**:
```sql
-- セッションテーブルを確認
SELECT * FROM "Session" WHERE "userId" = 'your-user-id';

-- 期限切れセッションを削除
DELETE FROM "Session" WHERE "expires" < NOW();
```

## 監視とメトリクス

### 監視すべきメトリクス

1. **認証成功率**
   - Auth0: 移行前の成功率をベースライン化
   - Keycloak: 移行後の成功率を監視

2. **エラーレート**
   - Auth0関連エラー（移行後は減少すべき）
   - Keycloak関連エラー（移行後に監視）

3. **レスポンスタイム**
   - ログイン処理時間
   - セッション検証時間

4. **データベースメトリクス**
   - Session テーブルのサイズ
   - Account テーブルのレコード数

### ログの確認

```bash
# 認証関連のログ
grep "\[Auth\]" logs/*.log

# エラーログ
grep "ERROR" logs/*.log | grep -i "auth\|session\|keycloak"
```

## 参考資料

- [Next-Auth.js v5 Documentation](https://authjs.dev/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Prisma Adapter for Auth.js](https://authjs.dev/reference/adapter/prisma)

## チェックリスト

マイグレーション完了前に以下を確認：

### 開発環境
- [ ] Keycloakコンテナが起動している
- [ ] 環境変数が正しく設定されている
- [ ] データベーススキーマが更新されている
- [ ] `pnpm typecheck` が成功する
- [ ] `pnpm build` が成功する
- [ ] `pnpm test` が成功する
- [ ] すべての動作確認項目がチェックされている

### 本番環境
- [ ] データベースのバックアップが完了している
- [ ] Keycloakサーバーが稼働している
- [ ] Keycloak RealmとClient設定が完了している
- [ ] 環境変数が本番環境に設定されている
- [ ] ロールバック手順がテストされている
- [ ] ユーザーへの通知が完了している
- [ ] 監視・アラート設定が完了している
- [ ] 段階的ロールアウトの計画が承認されている

## サポート

問題が発生した場合：

1. このドキュメントのトラブルシューティングセクションを確認
2. GitHubのIssueを作成（Issue #892）
3. チーム内で相談
