# OAuthアクセストークン取得ガイド

## 概要

このドキュメントでは、Tumiki MCP ManagerでOAuthアクセストークンを取得する手順を説明します。

## アクセストークン取得手順

### 1. OAuth認証ページへアクセス

1. Tumiki MCP Managerにログイン
2. プロバイダー別のOAuth認証ページへアクセス
   - Google: `/google-oauth`
   - GitHub: `/github-oauth` 
   - Slack: `/slack-oauth`
   - その他: `/oauth`

### 2. スコープ（権限）の選択

1. 必要なAPIアクセス権限を選択
   - 各スコープには説明が表示されます
   - MCPサーバーが必要とする最小限のスコープを選択することを推奨
   - 「すべて選択」ボタンで全スコープを一括選択可能

### 3. OAuth認証フローの開始

1. 「[プロバイダー名]アカウントと接続」ボタンをクリック
2. `/oauth/auth/login` エンドポイント経由でAuth0の認証画面へリダイレクトされます
3. プロバイダー側でログインし、要求された権限を承認

### 4. アクセストークンの取得

認証成功後、`/oauth/auth/callback` 経由でTumikiへリダイレクトされます：

1. 接続ステータスが「接続済み」になっていることを確認
2. アクセストークンが自動的に表示されます
3. トークンをコピーして使用するか、MCPサーバーで自動利用

## トークンの管理

### トークンのコピー

- 「コピー」ボタンをクリックしてクリップボードにコピー
- トークンは安全に管理してください

### トークンの更新

- 「更新」ボタンでトークンを再取得
- Auth0が自動的にリフレッシュトークンを使用して更新

### トークンの自動注入

MCPサーバー利用時は、ProxyServerが自動的にトークンを環境変数に注入：

- Google: `GOOGLE_TOKEN`
- GitHub: `GITHUB_TOKEN`
- Slack: `SLACK_TOKEN`
- Notion: `NOTION_TOKEN`
- LinkedIn: `LINKEDIN_TOKEN`

## トラブルシューティング

### 「アクセストークンが見つかりません」エラー

1. 再度OAuth認証を実行
2. 必要なスコープが選択されているか確認
3. プロバイダー側で権限が承認されているか確認

### トークンの有効期限切れ

- Auth0が自動的にリフレッシュトークンで更新
- 手動更新が必要な場合は「更新」ボタンを使用

### 接続エラー

1. Auth0の設定を確認
2. プロバイダー側のアプリ設定を確認
3. ネットワーク接続を確認

## プログラマティックアクセス

### tRPCエンドポイント

```typescript
// 接続ステータス確認
const status = await trpc.oauth.getConnectionStatus.query({ 
  provider: "google" 
});

// アクセストークン取得（Google用）
const tokenData = await trpc.oauth.getGoogleAccessToken.query();

// OAuth認証開始
const result = await trpc.oauth.startOAuthConnection.mutate({
  provider: "google",
  scopes: ["drive.readonly", "calendar.readonly"],
  returnTo: "/google-oauth?connected=true"
});
```

### 内部API（サーバーサイド）

```typescript
import { getProviderAccessToken } from "@tumiki/auth/server";

// アクセストークン取得
const token = await getProviderAccessToken("google", request);

// 接続状態確認
const isConnected = await checkOAuthConnection("google", request);
```

## セキュリティ上の注意

- アクセストークンは機密情報です
- トークンをクライアントサイドのコードに直接埋め込まない
- 公開リポジトリにコミットしない
- HTTPSを使用した安全な通信経路でのみ送信
- 定期的にトークンを更新し、不要になったら削除

## 関連ドキュメント

- [OAuth認証実装ガイド](./OAUTH_IMPLEMENTATION.md)
- [新しいOAuthプロバイダーの追加方法](./OAUTH_PROVIDER_GUIDE.md)