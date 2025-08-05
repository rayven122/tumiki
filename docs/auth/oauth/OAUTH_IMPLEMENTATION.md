# OAuth認証実装ガイド

## 概要

このドキュメントでは、Tumiki MCP ManagerにおけるOAuth認証の実装について説明します。Auth0を使用してマルチプロバイダー対応のOAuth認証を実現し、MCPサーバーが自動的に認証済みAPIを利用できるようにしています。

## アーキテクチャ

### 1. 認証フロー

```
ユーザー → Tumiki → Auth0 → OAuthプロバイダー（Google, GitHub等）
```

- ユーザーがプロバイダーを選択してOAuth認証を開始
- `/oauth/auth/login` エンドポイント経由でAuth0の認証画面へリダイレクト
- 認証成功後、`/oauth/auth/callback` へコールバック
- Auth0がアクセストークンを管理
- ProxyServerがMCPサーバーへのリクエスト時に自動的にトークンを注入

### 2. データベース構造

#### McpServerテーブルの拡張
```prisma
model McpServer {
  // ... 既存フィールド
  authType         AuthType    @default(NONE)  // 認証タイプ
  oauthProvider    String?     // OAuthプロバイダー名
  oauthScopes      String[]    // 必要なスコープ
}
```

#### UserMcpServerConfigテーブルの拡張
```prisma
model UserMcpServerConfig {
  // ... 既存フィールド
  oauthConnection  String?     // Auth0のconnection名
  oauthScopes      String[]    // ユーザーが選択した追加スコープ
}
```

### 3. 認証タイプ

```prisma
enum AuthType {
  NONE      // 認証不要
  API_KEY   // APIキー認証
  OAUTH     // OAuth認証
}
```

## 実装詳細

### 1. Auth0パッケージ（`@tumiki/auth`）

#### クライアント設定（`packages/auth/src/clients.ts`）

2つのAuth0クライアントを使用：
- `auth0`: メイン認証用
- `auth0OAuth`: OAuth専用（ルート設定付き）
  ```typescript
  routes: {
    login: "/oauth/auth/login",
    callback: "/oauth/auth/callback",
    logout: "/oauth/auth/logout",
  }
  ```

#### OAuth関数（`packages/auth/src/oauth.ts`）

- `getProviderAccessToken()`: プロバイダー別のアクセストークンを取得
- `startOAuthFlow()`: OAuth認証フローを開始
- `checkOAuthConnection()`: 接続ステータスを確認
- `getUserIdentityProviderTokens()`: ユーザーのプロバイダートークンを取得

#### プロバイダー設定（`packages/auth/src/providers.ts`）

- `OAUTH_PROVIDERS`: 利用可能なプロバイダーのリスト
- `PROVIDER_CONNECTIONS`: プロバイダーとAuth0のConnection名のマッピング
- `isValidOAuthProvider()`: プロバイダー名の検証関数

### 2. tRPCルーター（`apps/manager/src/server/api/routers/oauth.ts`）

以下のエンドポイントを提供：

- `startOAuthConnection`: OAuth認証フローを開始
- `getProviderAccessToken`: プロバイダー別のアクセストークンを取得
- `getConnectionStatus`: 接続ステータスを確認

### 3. ProxyServerの拡張（`apps/proxyServer/src/utils/proxy.ts`）

`getServerConfigs`関数でOAuth認証の処理を追加：

1. MCPサーバーの`authType`が`OAUTH`の場合を検出
2. Auth0からアクセストークンを取得
3. 環境変数にトークンを自動注入（例：`SLACK_TOKEN`, `GITHUB_TOKEN`）

### 4. MCPサーバー定義の更新（`apps/manager/src/constants/mcpServers.ts`）

各MCPサーバーに認証情報を追加：

```typescript
{
  name: "Slack MCP",
  authType: AuthType.OAUTH,
  oauthProvider: "slack",
  oauthScopes: ["channels:read", "chat:write", "users:read"],
  // ...
}
```

## 対応プロバイダー

現在、以下のプロバイダーに対応しています：

- **Google**: Drive, Calendar, Gmail等のAPIアクセス
- **GitHub**: リポジトリ、Gist、組織の管理
- **Slack**: チャンネル、メッセージ、ユーザー情報
- **Notion**: ページとデータベースの読み書き
- **LinkedIn**: プロフィール情報と投稿
- **Figma**: デザインファイルとプロジェクトへのアクセス

## 使用方法

### 1. MCPサーバーの追加時

1. 認証タイプとして「OAuth」を選択
2. 「接続」ボタンをクリックしてAuth0経由で認証
3. スコープはAuth0側で自動的に管理される

### 2. トークンの自動管理

- アクセストークンはAuth0が管理
- リフレッシュトークンによる自動更新
- MCPサーバーへのリクエスト時に自動的にトークンが注入される

## セキュリティ

- アクセストークンはAuth0のセキュアなストレージで管理
- データベースにはトークンを保存しない
- PKCE対応のOAuthフローを使用
- スコープはAuth0側で管理し、必要最小限のスコープのみを要求

## トラブルシューティング

### OAuth接続に失敗する場合

1. Auth0の設定を確認
   - OAuth専用アプリケーションのAllowed Callback URLsに`/oauth/auth/callback`が含まれているか
   - Social ConnectionがOAuth専用アプリケーションで有効化されているか
2. プロバイダー側のアプリ設定を確認
3. 必要なスコープが正しく設定されているか確認
4. 環境変数の設定を確認
   - `AUTH0_OAUTH_CLIENT_ID`
   - `AUTH0_OAUTH_CLIENT_SECRET`

### トークンが期限切れの場合

- Auth0が自動的にリフレッシュトークンを使用して更新
- 手動で再接続が必要な場合は、UI上の「再接続」ボタンを使用

## 今後の拡張

- 新しいプロバイダーの追加（`providers.ts`への追加のみで対応可能）
- トークンの手動リフレッシュ機能
- 接続履歴の表示
- プロバイダー別のカスタム設定