# Auth0 検証モード - 認証バイパスガイド

## 概要

検証モードは、開発・テスト環境でAuth0認証をバイパスし、定義済みの検証ユーザーとして自動ログインできる機能です。E2Eテスト、開発時のクイックアクセス、デモ環境での利用を想定しています。

**セキュリティ**: 本番環境では自動的に無効化され、誤って有効化しようとするとエラーが発生します。

## 検証ユーザー

### 利用可能なユーザー

| ユーザーID | メールアドレス | 名前 | ロール |
|-----------|--------------|------|--------|
| `verification\|admin` | `admin@verification.local` | Admin User (Verification) | `SYSTEM_ADMIN` |
| `verification\|user` | `user@verification.local` | Regular User (Verification) | `USER` |

### 共有組織

両ユーザーは共有組織に所属しています：

- **組織ID**: `org_verification|user`
- **組織名**: Verification Organization
- **管理者権限**: 両ユーザーとも管理者
- **デフォルト組織**: 両ユーザーのデフォルト組織として設定済み

## 環境設定

### 1. 環境変数の設定

プロジェクトルートの `.env` ファイルに以下を追加：

```bash
# 検証モードを有効化（開発環境のみ）
VERIFICATION_MODE=true

# デフォルトの検証ユーザー（省略可能、デフォルト: verification|admin）
VERIFICATION_USER_ID=verification|admin

# 利用可能な検証ユーザーのリスト（省略可能）
VERIFICATION_AVAILABLE_USERS=verification|admin,verification|user
```

**重要**:
- `NODE_ENV=production` の場合、`VERIFICATION_MODE=true` を設定してもエラーが発生し無効化されます
- 開発環境（`NODE_ENV=development`）でのみ動作します

### 2. データベースセットアップ

検証ユーザーをデータベースに作成するスクリプトを実行：

```bash
# 検証ユーザーと組織を作成
pnpm tsx scripts/setup-verification-users.ts
```

このスクリプトは以下を実行します：

1. 古い組織（`org_verification|admin`）を削除
2. 共有組織（`org_verification|user`）を作成
3. 2つの検証ユーザーを作成
4. 両ユーザーを共有組織に追加（管理者権限付き）
5. 各ユーザーのデフォルト組織を設定

## 使用方法

### 方法1: 自動ログイン（デフォルト）

検証モードが有効な場合、アプリケーションにアクセスすると自動的にデフォルトユーザーとしてログインされます：

```bash
# ブラウザでアクセス
https://local.tumiki.cloud:3000
```

コンソールに以下のようなメッセージが表示されます：

```
⚠️  [VERIFICATION MODE] Auto-login as: verification|admin
```

### 方法2: ユーザーを切り替える

URLクエリパラメータを使用して異なる検証ユーザーに切り替え：

```bash
# 管理者ユーザーとしてログイン
https://local.tumiki.cloud:3000?verification_user=verification|admin

# 一般ユーザーとしてログイン
https://local.tumiki.cloud:3000?verification_user=verification|user
```

ユーザーを切り替えると、Cookieが更新され次回からは新しいユーザーとして自動ログインされます。

### 方法3: プログラムでCookieを設定

E2Eテストやスクリプトから直接Cookieを設定することも可能：

```typescript
// Playwright使用例
await page.context().addCookies([
  {
    name: '__verification_session',
    value: 'verification|admin',
    domain: 'local.tumiki.cloud',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }
]);

await page.goto('https://local.tumiki.cloud:3000');
```

## E2Eテストでの使用例

### Playwright テスト例

```typescript
import { test, expect } from '@playwright/test';

test.describe('管理者機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 検証モードで管理者としてログイン
    await page.context().addCookies([
      {
        name: '__verification_session',
        value: 'verification|admin',
        domain: 'local.tumiki.cloud',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      }
    ]);

    await page.goto('https://local.tumiki.cloud:3000/dashboard');
  });

  test('管理者ダッシュボードにアクセスできる', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });
});

test.describe('一般ユーザー機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 一般ユーザーとしてログイン
    await page.context().addCookies([
      {
        name: '__verification_session',
        value: 'verification|user',
        domain: 'local.tumiki.cloud',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      }
    ]);

    await page.goto('https://local.tumiki.cloud:3000');
  });

  test('管理者ページにはアクセスできない', async ({ page }) => {
    await page.goto('https://local.tumiki.cloud:3000/admin');
    // 権限エラーまたはリダイレクトを確認
    await expect(page).toHaveURL(/\/(dashboard|error)/);
  });
});
```

### Cypress テスト例

```typescript
describe('検証モードでのテスト', () => {
  beforeEach(() => {
    // 管理者ユーザーでログイン
    cy.setCookie('__verification_session', 'verification|admin', {
      domain: 'local.tumiki.cloud',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    cy.visit('https://local.tumiki.cloud:3000');
  });

  it('ダッシュボードにアクセスできる', () => {
    cy.get('[data-testid="user-menu"]').should('contain', 'Admin User');
  });
});
```

## 仕組みの詳細

### 認証バイパスフロー

1. **ミドルウェア処理** (`apps/manager/src/middleware.ts`):
   - リクエストを受信
   - `isVerificationModeEnabled()` をチェック
   - Cookie `__verification_session` から現在のユーザーIDを取得
   - クエリパラメータ `verification_user` があれば優先
   - Cookieを設定してAuth0認証をスキップ

2. **tRPCコンテキスト生成** (`apps/manager/src/server/api/trpc.ts`):
   - Cookie `__verification_session` から検証ユーザーIDを取得
   - 定義済みのユーザー情報マッピングから情報を取得
   - モックセッションオブジェクトを作成
   - 通常のAuth0セッションの代わりに使用

### セッションCookieの仕様

- **Cookie名**: `__verification_session`
- **値**: `verification|admin` または `verification|user`
- **属性**:
  - `httpOnly: true` - XSS攻撃からの保護
  - `secure: process.env.NODE_ENV === "production"` - 本番ではHTTPS必須
  - `sameSite: "lax"` - CSRF対策
  - `path: "/"` - 全パスで有効
  - `maxAge: 86400` - 24時間有効

### tRPCコンテキストでの処理

```typescript
// apps/manager/src/server/api/trpc.ts の処理フロー

// 1. Cookieから検証ユーザーIDを取得
const verificationUserId = decodeURIComponent(cookieValue);

// 2. ユーザー情報マッピングから取得
const userInfo = verificationUsers[verificationUserId];

// 3. モックセッションを作成
session = {
  user: {
    sub: verificationUserId,
    email: userInfo.email,
    name: userInfo.name,
  },
} as SessionReturnType;

// 4. 通常のセッションとして使用
// - authenticatedProcedure: セッションチェックをパス
// - protectedProcedure: 組織チェックも正常に動作
```

## セキュリティ上の注意点

### 本番環境での保護

検証モードは以下のセキュリティメカニズムで保護されています：

1. **環境チェック**: `NODE_ENV=production` では自動的に無効化
2. **検証関数**: `validateVerificationMode()` が本番環境での誤動作を防止
3. **エラースロー**: 本番環境で有効化しようとするとアプリケーションが起動時にエラー

```typescript
// packages/auth/src/verification.ts
export const isVerificationModeEnabled = (): boolean => {
  // 本番環境では常にfalse
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.VERIFICATION_MODE === "true";
};
```

### ベストプラクティス

1. **環境変数の管理**:
   - `.env.local` に設定し、`.env` には含めない
   - バージョン管理に `.env.local` を含めない

2. **本番デプロイ前のチェック**:
   - `VERIFICATION_MODE` が環境変数から削除されていることを確認
   - CI/CDで環境変数を検証

3. **テスト環境の分離**:
   - 本番データベースでは検証ユーザーを作成しない
   - テスト用データベースのみで使用

4. **ログ出力**:
   - 検証モードが有効な場合は警告をコンソールに出力
   - デバッグ時に認証状態を確認可能

## トラブルシューティング

### 検証モードが動作しない

**症状**: 通常のAuth0ログイン画面が表示される

**確認事項**:
1. `.env` に `VERIFICATION_MODE=true` が設定されているか
2. `NODE_ENV=development` であるか
3. データベースに検証ユーザーが作成されているか
4. アプリケーションを再起動したか

**解決方法**:
```bash
# 環境変数を確認
cat .env | grep VERIFICATION

# データベースを確認
pnpm tsx scripts/setup-verification-users.ts

# アプリケーションを再起動
pnpm dev
```

### Cookieが設定されない

**症状**: 自動ログインが機能しない

**確認事項**:
1. ブラウザのCookie設定を確認
2. HTTPSを使用しているか（`local.tumiki.cloud:3000`）
3. ドメインが一致しているか

**解決方法**:
```bash
# ブラウザの開発者ツールでCookieを確認
# Application > Cookies > https://local.tumiki.cloud:3000

# 手動でCookieを設定
document.cookie = "__verification_session=verification|admin; path=/; domain=local.tumiki.cloud";
```

### 組織が見つからないエラー

**症状**: ログイン後に組織エラーが発生

**原因**: データベースに組織とメンバーシップが作成されていない

**解決方法**:
```bash
# セットアップスクリプトを再実行
pnpm tsx scripts/setup-verification-users.ts

# データベースを確認
pnpm --filter @tumiki/db db:studio
# User, Organization, OrganizationMember テーブルを確認
```

## まとめ

検証モードを使用すると、以下のメリットがあります：

✅ Auth0の設定なしでローカル開発が可能
✅ E2Eテストで複数のユーザーロールをテスト可能
✅ デモ環境で一貫したユーザー体験を提供
✅ 本番環境では自動的に無効化され安全

開発・テスト環境での効率的な認証バイパスにより、開発サイクルを加速できます。
