# OAuth認証を別のAuth0アプリケーションで管理するガイド

## 概要

このドキュメントでは、OAuth認証（Google、GitHub等の外部プロバイダー）を別のAuth0アプリケーションで管理する方法について説明します。これにより、ユーザー認証とOAuth管理を分離し、セキュリティと管理性を向上させます。

## アーキテクチャ

### 現在の構成
```
Auth0アプリケーション（単一）
├── ユーザー認証
└── OAuth接続管理（Google, GitHub等）
```

### 新しい構成
```
Auth0テナント
├── メインアプリケーション（既存）
│   └── ユーザー認証専用
└── OAuth管理アプリケーション（新規）
    └── OAuth接続専用
```

## 実装手順

### 1. Auth0での新しいアプリケーション作成

1. Auth0ダッシュボードにログイン
2. Applications > Create Application
3. 以下の設定で作成：
   - **Name**: `Tumiki OAuth Manager`
   - **Application Type**: `Regular Web Application`

4. 作成後、以下を設定：
   - **Allowed Callback URLs**: 
     ```
     http://localhost:3000/oauth/auth/callback
     https://your-domain.com/oauth/auth/callback
     ```
   - **Allowed Logout URLs**:
     ```
     http://localhost:3000
     https://your-domain.com
     ```
   - **Allowed Web Origins**:
     ```
     http://localhost:3000
     https://your-domain.com
     ```

5. Client IDとClient Secretを記録

### 2. 環境変数の設定

`.env`ファイルに以下を追加：

```bash
# 既存のメインアプリケーション設定
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=<既存のClient ID>
AUTH0_CLIENT_SECRET=<既存のClient Secret>
AUTH0_SECRET=<既存のSecret>

# OAuth管理専用アプリケーション設定（新規追加）
AUTH0_OAUTH_CLIENT_ID=<新しいClient ID>
AUTH0_OAUTH_CLIENT_SECRET=<新しいClient Secret>

# Management API設定（変更なし）
AUTH0_M2M_CLIENT_ID=<既存のM2M Client ID>
AUTH0_M2M_CLIENT_SECRET=<既存のM2M Client Secret>
```

### 3. Auth0クライアントの分離

`packages/auth/src/clients.ts`を以下のように更新：

```typescript
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { ManagementClient } from "auth0";

// メイン認証用クライアント（既存）
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  appBaseUrl: process.env.APP_BASE_URL!,
  secret: process.env.AUTH0_SECRET!,
});

// OAuth管理専用クライアント（新規）
export const auth0OAuth = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_OAUTH_CLIENT_ID!,
  clientSecret: process.env.AUTH0_OAUTH_CLIENT_SECRET!,
  appBaseUrl: process.env.APP_BASE_URL!,
  secret: process.env.AUTH0_SECRET!,
  routes: {
    login: "/oauth/auth/login",
    callback: "/oauth/auth/callback",
    logout: "/oauth/auth/logout",
  },
});

// Management API クライアント（変更なし）
export const managementClient = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_M2M_CLIENT_ID!,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET!,
});
```

### 4. ミドルウェアの更新

`apps/manager/src/middleware.ts`でOAuthパスを専用クライアントで処理：

```typescript
import { auth0, auth0OAuth } from "@tumiki/auth/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // OAuth専用パスの判定
  const isOAuthPath = 
    pathname.includes("-oauth") || 
    pathname.startsWith("/oauth/");
  
  // OAuth専用パスの場合はOAuth専用クライアントを使用
  if (isOAuthPath) {
    return auth0OAuth.middleware(request);
  }
  
  // その他はメイン認証クライアントを使用
  return auth0.middleware(request);
}
```

### 5. OAuth機能の更新

`packages/auth/src/oauth.ts`では既に`auth0`クライアントを使用しているため、特別な変更は不要です。ミドルウェアが適切なクライアントを選択してセッションを管理します。

### 6. APIルーターの更新

`apps/manager/src/server/api/routers/oauth/`配下のファイルは、既存の`auth0`クライアントを使用し続けます。ミドルウェアが適切にセッションを管理するため、変更は不要です。

### 7. ProxyServerの設定

ProxyServerはユーザーのセッションからトークンを取得するため、特別な変更は不要です。

## 移行手順

### 開発環境での検証

1. 環境変数を設定
2. アプリケーションを起動
3. OAuth認証フローをテスト
   - 各プロバイダー（Google、GitHub等）でテスト
   - アクセストークンの取得を確認
   - MCPサーバーでのトークン利用を確認

### 本番環境への適用

1. Auth0本番環境で新しいアプリケーションを作成
2. Vercelの環境変数を更新：
   ```bash
   npm run vercel:env:update
   ```
3. デプロイ：
   ```bash
   npm run deploy
   ```

## 注意事項

### セキュリティ

- OAuth専用アプリケーションには最小限の権限のみを付与
- Client Secretは厳重に管理
- 定期的にアクセスログを監査

### 互換性

- 既存のOAuth接続は再認証が必要になる可能性があります
- ユーザーには再度OAuth認証を求める通知が必要

### 監視

- Auth0ダッシュボードで両アプリケーションのログを監視
- 異常なアクセスパターンがないか確認

## トラブルシューティング

### OAuth認証が失敗する

1. 環境変数が正しく設定されているか確認
2. Auth0アプリケーションのCallback URLが正しいか確認
3. Client ID/Secretが正しいか確認

### アクセストークンが取得できない

1. Management APIの権限を確認
2. OAuth専用アプリケーションがManagement APIにアクセスできるか確認

### セッションエラー

1. AUTH0_SECRETが両方のクライアントで同じか確認
2. Cookieの設定を確認

## ロールバック手順

問題が発生した場合は、環境変数を元に戻すことで既存の構成に戻せます：

1. OAuth関連の環境変数を削除
2. コードを元の状態に戻す
3. アプリケーションを再デプロイ

## テストとデプロイ手順

### 開発環境でのテスト

1. **環境変数の設定**
   ```bash
   # .envファイルに追加
   cp .env.oauth.example .env.oauth
   # .env.oauthを編集してClient ID/Secretを設定
   cat .env.oauth >> .env
   ```

2. **アプリケーションの起動**
   ```bash
   pnpm dev
   ```

3. **OAuth認証フローのテスト**
   - ブラウザで http://localhost:3000/google-oauth にアクセス
   - OAuth認証フローが正常に動作することを確認
   - アクセストークンが取得できることを確認

4. **コードの検証**
   ```bash
   pnpm format:fix
   pnpm lint:fix
   pnpm typecheck
   pnpm build
   ```

### 本番環境へのデプロイ

1. **Vercel環境変数の設定**
   ```bash
   # 環境変数の追加
   vercel env add AUTH0_OAUTH_CLIENT_ID production
   vercel env add AUTH0_OAUTH_CLIENT_SECRET production
   
   # または、.env.localファイルを使用
   npm run vercel:env:update
   ```

2. **デプロイ実行**
   ```bash
   npm run deploy
   ```

3. **動作確認**
   - 本番環境でOAuth認証フローをテスト
   - 各プロバイダー（Google、GitHub等）でアクセストークン取得を確認
   - MCPサーバーでのトークン利用を確認

### 監視とメンテナンス

1. **ログの確認**
   - Auth0ダッシュボードでログを確認
   - 両アプリケーション（メイン/OAuth）のアクティビティを監視

2. **定期的な確認事項**
   - アクセストークンの有効期限
   - OAuth接続の状態
   - エラーログの確認

3. **トラブルシューティング用コマンド**
   ```bash
   # ProxyServerのログ確認
   npm run proxy:logs
   
   # Auth0設定の検証
   npm run auth:verify
   ```

## 関連ドキュメント

- [OAuth認証実装ガイド](./OAUTH_IMPLEMENTATION.md)
- [OAuthアクセストークン取得ガイド](./OAUTH_ACCESS_TOKEN_GUIDE.md)
- [新しいOAuthプロバイダーの追加ガイド](./OAUTH_PROVIDER_GUIDE.md)