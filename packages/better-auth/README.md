# @tumiki/better-auth

Tumikiプロジェクト用の認証パッケージ。[Better Auth](https://www.better-auth.com/)をベースにKeycloak統合を提供します。

## 機能

### 🔐 Keycloak認証

- OIDC（OpenID Connect）プロトコルによるKeycloak統合
- PKCE（Proof Key for Code Exchange）によるセキュアな認証フロー
- セッションキャッシュによるパフォーマンス最適化（5分間）
- アカウントリンク機能のサポート

## インストール

```bash
pnpm add @tumiki/better-auth
```

## 環境変数

以下の環境変数を設定してください：

```env
# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://local.tumiki.cloud:3000

# Keycloak
KEYCLOAK_ISSUER=https://your-keycloak-server/realms/your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

## 使用方法

### クライアントサイド

```typescript
import { useSession, signIn, signOut } from "@tumiki/better-auth/client";

// セッション取得
const MyComponent = () => {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Welcome, {session.user.name}!</div>;
};

// サインイン
const handleSignIn = () => {
  signIn.keycloak();
};

// サインアウト
const handleSignOut = async () => {
  await signOut();
};
```

### サーバーサイド

```typescript
import type { Session, User } from "@tumiki/better-auth/server";
import { auth, getSession } from "@tumiki/better-auth/server";

// セッション取得
const session = await getSession();
if (session) {
  console.log("User:", session.user);
}

// Better Authインスタンスを直接使用
const user = await auth.api.getUser({ userId: "user-id" });
```

## API

### クライアント（`@tumiki/better-auth/client`）

#### `useSession()`

現在のセッション情報を取得するReact Hook。

**戻り値:**

- `data`: セッション情報（`Session | null`）
- `isPending`: ローディング状態（`boolean`）
- `error`: エラー情報

#### `signIn.keycloak()`

Keycloakを使用してサインイン。サインイン後は`/dashboard`にリダイレクトされます。

#### `signOut()`

現在のセッションをサインアウト。

**戻り値:** `Promise<void>`

### サーバー（`@tumiki/better-auth/server`）

#### `getSession()`

サーバーサイドで現在のセッションを取得。

**戻り値:** `Promise<Session | null>`

#### `auth`

Better Authインスタンス。低レベルAPIへのアクセスに使用。

### 型（`@tumiki/better-auth/server`）

#### `Session`

セッション情報の型。

```typescript
type Session = {
  user: User;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
};
```

#### `User`

ユーザー情報の型。

```typescript
type User = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  keycloakId?: string;
  role: string;
};
```

## アーキテクチャ

### ファイル構成

```
src/
├── client.ts          # クライアントサイドAPI
├── server.ts          # サーバーサイドAPI
└── config.ts          # Better Auth設定
```

### データベース統合

Prismaアダプターを使用してPostgreSQLと統合：

- セッション情報の永続化
- ユーザー情報の管理
- アカウント情報の管理

### セキュリティ機能

- **PKCE**: 認可コード横取り攻撃への対策
- **State Parameter**: CSRF攻撃への対策
- **Secure Cookies**: 本番環境でHTTPS専用Cookie
- **セッション管理**: セキュアなセッション管理とキャッシュ

## 関連ドキュメント

- [Better Auth公式ドキュメント](https://www.better-auth.com/docs)
- [Keycloak公式ドキュメント](https://www.keycloak.org/documentation)
- [OAuth 2.0 PKCE仕様](https://datatracker.ietf.org/doc/html/rfc7636)

## ライセンス

このパッケージはTumikiプロジェクトの一部です。
