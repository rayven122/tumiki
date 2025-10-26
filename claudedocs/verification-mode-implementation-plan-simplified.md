# 検証モード実装計画書（簡素化版）

## 1. 概要

### 1.1 基本方針

**既存のAuth0ユーザーを活用した最小実装**

専用のダミーユーザー実装を行わず、開発環境のAuth0に作成した実際のテストユーザーを利用することで、実装を最小限に抑える。

### 1.2 アプローチ

```
1. 開発環境のAuth0にテストユーザーを作成
   - admin@verification.local (SYSTEM_ADMIN)
   - user@verification.local (USER)

2. 環境変数でテストユーザーのメールアドレスを指定
   VERIFICATION_AUTO_LOGIN_EMAIL=admin@verification.local

3. ミドルウェアで検証モード時、指定ユーザーとして自動ログイン
   - Auth0の既存セッション機構を利用
   - セッション注入などの複雑な実装は不要
```

## 2. 必要な実装（最小限）

### 2.1 環境変数の追加

**ファイル**: `.env.example`

```bash
# 検証モードの有効化（developmentまたはtestのみ）
VERIFICATION_MODE=false

# 自動ログインするユーザーのメールアドレス
VERIFICATION_AUTO_LOGIN_EMAIL=admin@verification.local

# 自動ログインするユーザーのAuth0 ID（オプション：より高速）
VERIFICATION_AUTO_LOGIN_USER_ID=auth0|xxxxx
```

### 2.2 検証モードユーティリティ（最小版）

**ファイル**: `packages/auth/src/verification.ts`（新規作成）

```typescript
/**
 * 検証モードが有効かどうかをチェック
 */
export const isVerificationModeEnabled = (): boolean => {
  // 本番環境では常にfalse
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.VERIFICATION_MODE === 'true';
};

/**
 * 自動ログインするユーザー情報を取得
 */
export const getVerificationAutoLoginUser = (): {
  email?: string;
  userId?: string;
} => {
  return {
    email: process.env.VERIFICATION_AUTO_LOGIN_EMAIL,
    userId: process.env.VERIFICATION_AUTO_LOGIN_USER_ID,
  };
};

/**
 * セキュリティ検証
 */
export const validateVerificationMode = (): void => {
  if (process.env.NODE_ENV === 'production' && isVerificationModeEnabled()) {
    throw new Error('[SECURITY] Verification mode cannot be enabled in production');
  }
};
```

**実装量**: 約30行（型定義含む）

### 2.3 ミドルウェアの修正（最小限）

**ファイル**: `apps/manager/src/middleware.ts`

```typescript
import {
  isVerificationModeEnabled,
  getVerificationAutoLoginUser,
  validateVerificationMode,
} from "@tumiki/auth/verification";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  request.headers.set(URL_HEADER_KEY, request.url);

  // 既存のメンテナンスモードチェック...

  // 検証モードチェック
  if (isVerificationModeEnabled()) {
    validateVerificationMode();

    const { email, userId } = getVerificationAutoLoginUser();
    const verificationEmail = request.nextUrl.searchParams.get('verification_email') || email;
    const verificationUserId = request.nextUrl.searchParams.get('verification_user_id') || userId;

    // 認証不要のパスは除外
    const isPublicPath =
      (PUBLIC_PATHS as readonly string[]).includes(pathname) ||
      pathname.startsWith("/auth");

    if (!isPublicPath) {
      const session = await auth0.getSession(request);

      // セッションがない、または異なるユーザーの場合
      if (!session || (verificationEmail && session.user.email !== verificationEmail)) {
        // データベースから該当ユーザーを検索
        const user = await findUserForVerification(verificationEmail, verificationUserId);

        if (user) {
          // 既存のAuth0ログインフローを利用して自動ログイン
          // 注: この部分は実装時にAuth0の仕様を確認
          // 最もシンプルなのは、検証モード専用のログインエンドポイントを作成
          return NextResponse.redirect(
            new URL(`/api/verification/auto-login?user_id=${user.id}&returnTo=${encodeURIComponent(request.url)}`, request.url)
          );
        }
      }
    }
  }

  // 既存の認証ロジック...
}
```

**追加実装量**: 約20-30行

### 2.4 自動ログインAPI（最小限）

**ファイル**: `apps/manager/src/app/api/verification/auto-login/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@tumiki/auth/server";
import { isVerificationModeEnabled, validateVerificationMode } from "@tumiki/auth/verification";
import { db } from "@tumiki/db";

export async function GET(request: NextRequest) {
  // セキュリティチェック
  if (!isVerificationModeEnabled()) {
    return NextResponse.json({ error: "Verification mode is not enabled" }, { status: 403 });
  }

  try {
    validateVerificationMode();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const returnTo = searchParams.get('returnTo') || '/dashboard';

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // データベースからユーザー情報を取得
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Auth0セッションを作成
    // 注: Auth0の仕様に応じて実装を調整
    // 方法1: Auth0のManagement APIを使ってトークンを発行
    // 方法2: 開発環境専用の簡易セッション作成
    // 方法3: テスト用のAuth0 Actionを利用

    // ここでは最もシンプルな方法として、Auth0のログインURLにリダイレクト
    // ただし、検証モード専用のパラメータを付与
    return auth0.startInteractiveLogin({
      returnTo,
      authorizationParams: {
        // 検証モード用のヒント（Auth0 Actionで利用）
        login_hint: user.email,
      },
    });

  } catch (error) {
    console.error('[VERIFICATION MODE] Auto-login error:', error);
    return NextResponse.json(
      { error: "Auto-login failed" },
      { status: 500 }
    );
  }
}
```

**実装量**: 約50行

### 2.5 Auth0テストユーザーの作成

**手順**:

1. Auth0ダッシュボードで開発環境のテナントにログイン
2. User Management → Users → Create User
3. 以下のユーザーを作成：

```
ユーザー1:
- Email: admin@verification.local
- Password: Verification123!
- Connection: Username-Password-Authentication

ユーザー2:
- Email: user@verification.local
- Password: Verification123!
- Connection: Username-Password-Authentication
```

4. データベースに手動でユーザーレコードを作成（またはPost-Login Actionで自動作成）

```sql
INSERT INTO "User" (id, email, name, role)
VALUES
  ('auth0|admin-verification', 'admin@verification.local', 'Admin User (Verification)', 'SYSTEM_ADMIN'),
  ('auth0|user-verification', 'user@verification.local', 'Regular User (Verification)', 'USER');
```

## 3. さらに簡素化するオプション

### オプション1: Auth0 Actionの活用

**メリット**: ミドルウェアの実装がさらに簡単に

**実装**:
Auth0のPost-Login Actionで検証モードを検出し、自動的に指定ユーザーでログイン

```javascript
// Auth0 Action (Post-Login)
exports.onExecutePostLogin = async (event, api) => {
  // 検証モードフラグをチェック（リクエストパラメータから）
  const isVerificationMode = event.request.query.verification_mode === 'true';
  const verificationEmail = event.request.query.verification_email;

  if (isVerificationMode && verificationEmail) {
    // 指定されたユーザーでログインを強制
    api.user.setAppMetadata('verification_mode', true);
  }
};
```

### オプション2: 開発専用の簡易セッション

**メリット**: Auth0に一切依存しない

**実装**:
開発環境では、cookieに直接ユーザー情報を保存

```typescript
// middleware.ts
if (isVerificationModeEnabled() && !session) {
  // 簡易セッションをcookieに設定
  const response = NextResponse.next();
  response.cookies.set('__dev_session', JSON.stringify({
    user: {
      id: 'auth0|admin-verification',
      email: 'admin@verification.local',
      name: 'Admin User (Verification)',
    },
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
```

**注意**: この方法はAuth0の機能（トークンリフレッシュなど）が使えなくなるため、完全な開発専用

## 4. 推奨アプローチ

### 段階的実装

**Step 1: 最小実装（1-2時間）**
- 環境変数の追加（`.env.example`）
- `packages/auth/src/verification.ts` 作成（30行）
- Auth0にテストユーザー作成
- データベースにユーザーレコード追加

**Step 2: ミドルウェア修正（2-3時間）**
- `middleware.ts` に検証モードチェック追加（20-30行）
- クエリパラメータでのユーザー指定サポート

**Step 3: 自動ログインAPI（2-3時間）**
- `/api/verification/auto-login` 実装
- Auth0セッション作成ロジック

**合計実装時間**: 5-8時間
**合計コード量**: 約100-150行（既存コードの修正含む）

## 5. セキュリティ

### 5.1 最小限のチェック

```typescript
// 本番環境では絶対に無効
if (process.env.NODE_ENV === 'production') {
  return false;
}

// 環境変数が明示的にtrueの場合のみ
return process.env.VERIFICATION_MODE === 'true';
```

### 5.2 視覚的警告（オプション）

検証モード有効時、コンソールに警告を出力:

```typescript
if (isVerificationModeEnabled()) {
  console.warn('⚠️  VERIFICATION MODE ENABLED - NOT FOR PRODUCTION USE');
}
```

## 6. 使い方

### 6.1 基本的な使い方

```bash
# .envファイルに設定
VERIFICATION_MODE=true
VERIFICATION_AUTO_LOGIN_EMAIL=admin@verification.local

# アプリケーション起動
pnpm dev

# ブラウザでアクセス → 自動的にadmin@verification.localでログイン
```

### 6.2 ユーザー切り替え

```bash
# URLパラメータでユーザーを指定
https://local.tumiki.cloud:3000/dashboard?verification_email=user@verification.local
```

### 6.3 Playwright/Chrome DevTools MCPでの利用

```typescript
// Playwright
await page.goto('https://local.tumiki.cloud:3000?verification_email=admin@verification.local');
// 自動的にログイン済み状態

// Chrome DevTools MCP
await browser.navigate({
  url: 'https://local.tumiki.cloud:3000?verification_email=user@verification.local'
});
```

## 7. テスト

### 7.1 ユニットテスト

```typescript
// packages/auth/src/verification.test.ts
import { describe, test, expect } from 'vitest';
import { isVerificationModeEnabled } from './verification';

describe('isVerificationModeEnabled', () => {
  test('本番環境では常にfalse', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERIFICATION_MODE = 'true';
    expect(isVerificationModeEnabled()).toBe(false);
  });

  test('開発環境でVERIFICATION_MODE=trueの場合にtrue', () => {
    process.env.NODE_ENV = 'development';
    process.env.VERIFICATION_MODE = 'true';
    expect(isVerificationModeEnabled()).toBe(true);
  });
});
```

## 8. まとめ

### 実装規模

| 項目 | 規模 |
|-----|------|
| 新規ファイル | 2ファイル |
| 既存ファイル修正 | 2ファイル |
| 合計コード量 | 約100-150行 |
| 実装時間 | 5-8時間 |

### メリット

- ✅ 実装が最小限（100-150行）
- ✅ Auth0の既存機能を最大限活用
- ✅ セッション管理が自然に動作
- ✅ メンテナンスが容易

### 次のステップ

1. Auth0にテストユーザーを作成
2. `packages/auth/src/verification.ts` を実装
3. `middleware.ts` を修正
4. 動作確認

---

**作成日**: 2025-10-26
**バージョン**: 2.0（簡素化版）
