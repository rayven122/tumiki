# @tumiki/auth

Auth0を使用した認証機能を提供するパッケージです。ユーザー認証、セッション管理、OAuth接続機能をサポートします。

## 特徴

- 🔐 **Auth0統合** - Auth0による安全な認証基盤
- 🔑 **OAuth接続** - 複数のOAuthプロバイダーとの連携
- 🎯 **型安全** - TypeScriptによる完全な型定義
- 🚀 **Next.js最適化** - Server ComponentsとMiddlewareサポート
- 🏢 **マルチテナント対応** - 組織単位での認証管理
- 🛡️ **セキュリティ** - JWT、PKCE、セッションローテーション

## インストール

```bash
pnpm add @tumiki/auth
```

## 使用方法

### 基本的なセットアップ

```typescript
// サーバーサイドでの認証チェック
import { getSession } from "@tumiki/auth/server";

export default async function Page() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

### クライアントサイドでの使用

```typescript
// クライアントコンポーネントでのユーザー情報取得
import { useUser } from "@tumiki/auth/client";

export function UserProfile() {
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return <div>Hello, {user.name}!</div>;
}
```

### OAuth接続の管理

```typescript
import { createOAuthConnection, getOAuthTokens } from "@tumiki/auth";

// OAuth接続の開始
const connectionUrl = await createOAuthConnection({
  provider: "google",
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  userId: session.user.id,
});

// トークンの取得
const tokens = await getOAuthTokens({
  userId: session.user.id,
  provider: "google",
});
```

## API リファレンス

### サーバーサイドAPI (`/server`)

#### `getSession(): Promise<Session | null>`

現在のユーザーセッションを取得します。

```typescript
const session = await getSession();
if (session) {
  console.log("User ID:", session.user.id);
}
```

#### `requireAuth(): Promise<Session>`

認証が必要なページで使用。未認証の場合は自動的にログインページへリダイレクト。

```typescript
const session = await requireAuth();
// sessionは必ず存在する
```

#### `getOAuthTokens(params: GetOAuthTokensParams): Promise<OAuthTokens | null>`

保存されたOAuthトークンを取得します。

```typescript
const tokens = await getOAuthTokens({
  userId: "user_123",
  provider: "github",
});
```

#### `getUserIdentityProviderTokens(userId: string, provider: OAuthProvider): Promise<string | null>`

Auth0 Management APIを使用して、ユーザーのIDプロバイダートークンを取得します。

```typescript
const accessToken = await getUserIdentityProviderTokens(
  "auth0|123456",
  "google",
);

if (accessToken) {
  // Google APIを直接呼び出す
  const response = await fetch("https://www.googleapis.com/drive/v3/files", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
```

### クライアントサイドAPI (`/client`)

#### `useUser(): UserHook`

現在のユーザー情報を取得するReactフック。

```typescript
const { user, isLoading, error } = useUser();
```

#### `useSession(): SessionHook`

セッション情報を取得するReactフック。

```typescript
const { session, isLoading, mutate } = useSession();
```

### 共通API

#### `OAuthProvider`

サポートされているOAuthプロバイダーの型定義。

```typescript
type OAuthProvider =
  | "google"
  | "github"
  | "slack"
  | "notion"
  | "figma"
  | "asana"
  | "linear";
```

#### `PROVIDER_CONNECTIONS`

プロバイダーとAuth0 Connection名のマッピング。

```typescript
const PROVIDER_CONNECTIONS = {
  google: "google-oauth2",
  github: "github",
  slack: "slack",
  notion: "notion",
  figma: "oauth2-figma",
  asana: "asana",
  linear: "linear",
} as const;
```

#### `AuthError`

認証関連のエラークラス。

```typescript
class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
    public statusCode: number
  );
}
```

## OAuth プロバイダー設定

### サポートされているプロバイダー

- **Google**: Drive、Calendar、Gmail等のGoogleサービス
- **GitHub**: リポジトリ、Issues、Pull Requests
- **Slack**: ワークスペース、チャンネル、メッセージ
- **Notion**: ページ、データベース
- **Figma**: デザインファイル、コメント
- **Asana**: タスク、プロジェクト
- **Linear**: Issues、プロジェクト

### スコープの設定

各プロバイダーで必要なスコープを指定できます：

```typescript
// Google Drive の読み取り権限
const googleScopes = ["https://www.googleapis.com/auth/drive.readonly"];

// GitHub のリポジトリアクセス
const githubScopes = ["repo", "read:user"];
```

## セキュリティ

### JWT トークン

- Auth0のJWTトークンを使用
- RS256アルゴリズムで署名
- 定期的なトークンローテーション

### セッション管理

- サーバーサイドセッション
- HTTPOnly Cookieによる保護
- CSRF対策

### OAuth セキュリティ

- PKCE（Proof Key for Code Exchange）フロー
- state パラメータによるCSRF防止
- トークンの暗号化保存

## エラーハンドリング

```typescript
import { AuthError, isAuthError } from "@tumiki/auth";

try {
  const session = await requireAuth();
} catch (error) {
  if (isAuthError(error)) {
    switch (error.code) {
      case "UNAUTHORIZED":
        // 未認証
        break;
      case "FORBIDDEN":
        // アクセス権限なし
        break;
      case "SESSION_EXPIRED":
        // セッション期限切れ
        break;
    }
  }
}
```

## 環境変数

必要な環境変数：

```env
# Auth0設定
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=your-auth0-secret

# OAuth暗号化キー
OAUTH_ENCRYPTION_KEY=your-32-byte-encryption-key

# コールバックURL
AUTH0_BASE_URL=https://your-app.com
```

## 開発

### ビルド

```bash
pnpm build
```

### テスト

```bash
pnpm test
```

### 型チェック

```bash
pnpm typecheck
```

## マイグレーションガイド

### v0.x から v1.0 へ

1. 環境変数名の変更

   - `NEXTAUTH_URL` → `AUTH0_BASE_URL`
   - `NEXTAUTH_SECRET` → `AUTH0_SECRET`

2. API の変更
   - `getServerSession()` → `getSession()`
   - `useSession()` のレスポンス形式が変更

## トラブルシューティング

### セッションが取得できない

- Cookieが正しく設定されているか確認
- `AUTH0_SECRET`が設定されているか確認
- ミドルウェアが正しく設定されているか確認

### OAuthトークンが無効

- トークンの有効期限を確認
- リフレッシュトークンによる更新を実装
- スコープが正しく設定されているか確認

## ライセンス

Private Package - Tumiki Project Only
