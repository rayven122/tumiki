# 外部サービス連携ドキュメント

このディレクトリには、Tumiki MCP ManagerとOAuth認証を使用した外部サービスとの連携設定に関するドキュメントが含まれています。

## 📂 ドキュメント一覧

### OAuth プロバイダー設定

- [auth0-figma-oauth-setup.md](./auth0-figma-oauth-setup.md) - Figma OAuth設定ガイド
  - Figma App作成手順
  - Auth0 Social Connection設定
  - スコープ設定
  - テスト方法

- [auth0-notion-oauth-setup.md](./auth0-notion-oauth-setup.md) - Notion OAuth設定ガイド
  - Notion Integration作成
  - Auth0設定
  - 権限管理
  - トラブルシューティング

## 🔌 連携可能なサービス

### 現在対応済み

| サービス | 用途 | 認証方式 | ステータス |
|---------|------|---------|-----------|
| Google | Drive, Calendar, Gmail | OAuth 2.0 | ✅ 稼働中 |
| GitHub | リポジトリ, Issues | OAuth 2.0 | ✅ 稼働中 |
| Slack | メッセージ, チャンネル | OAuth 2.0 | ✅ 稼働中 |
| Notion | ページ, データベース | OAuth 2.0 | ✅ 稼働中 |
| Figma | デザインファイル | OAuth 2.0 | ✅ 稼働中 |

### 開発予定

| サービス | 用途 | 認証方式 | 予定時期 |
|---------|------|---------|---------|
| Asana | タスク管理 | OAuth 2.0 | 2025 Q1 |
| Linear | Issue管理 | OAuth 2.0 | 2025 Q1 |
| Salesforce | CRM | OAuth 2.0 | 2025 Q2 |
| HubSpot | マーケティング | OAuth 2.0 | 2025 Q2 |

## 🚀 新しいサービスの追加手順

### 1. OAuth アプリケーション作成

1. 対象サービスの開発者ポータルでアプリを作成
2. リダイレクトURIを設定: `https://YOUR_AUTH0_DOMAIN/login/callback`
3. 必要なスコープを選択
4. Client ID/Secretを取得

### 2. Auth0 設定

1. Auth0ダッシュボードで新しいSocial Connectionを作成
2. カスタムOAuth2接続を選択
3. 以下を設定:
   ```
   - Authorization URL
   - Token URL
   - Scope
   - Client ID/Secret
   ```

### 3. コード実装

```typescript
// packages/auth/src/providers.ts に追加
export const PROVIDER_CONNECTIONS = {
  // ...existing providers
  newservice: "oauth2-newservice",
} as const;
```

### 4. MCPサーバー定義

```sql
-- MCPサーバーをデータベースに追加
INSERT INTO "McpServer" (
  id, name, transportType, url, 
  authType, oauthProvider, oauthScopes
) VALUES (
  'mcp-newservice',
  'NewService MCP Server',
  'STREAMABLE_HTTPS',
  'https://api.newservice.com/mcp',
  'OAUTH',
  'newservice',
  '["read", "write"]'
);
```

## 📋 設定チェックリスト

新しいOAuthプロバイダーを追加する際のチェックリスト:

- [ ] 開発者アプリケーションの作成
- [ ] リダイレクトURIの設定
- [ ] 必要なスコープの確認
- [ ] Auth0 Social Connection設定
- [ ] テスト環境での動作確認
- [ ] ドキュメントの作成
- [ ] 本番環境への反映

## 🔒 セキュリティ考慮事項

### スコープの最小化

- 必要最小限のスコープのみ要求
- 読み取り専用から開始
- ユーザーの明示的な同意

### トークン管理

- アクセストークンはAuth0が管理
- リフレッシュトークンの適切な処理
- トークンの有効期限管理

### エラーハンドリング

- 認証エラーの適切な処理
- ユーザーへの分かりやすいメッセージ
- リトライメカニズム

## 🐛 トラブルシューティング

### よくある問題

1. **Invalid redirect_uri エラー**
   - Auth0のコールバックURLが正しく設定されているか確認
   - HTTPSを使用しているか確認

2. **Scope not authorized エラー**
   - アプリケーションに必要なスコープが許可されているか確認
   - OAuth プロバイダー側の設定を確認

3. **Token refresh failed**
   - リフレッシュトークンの有効期限確認
   - OAuth プロバイダーの設定確認

## 🔗 関連ドキュメント

- [OAuth認証実装ガイド](../auth/oauth/OAUTH_IMPLEMENTATION.md)
- [新しいOAuthプロバイダーの追加](../auth/oauth/OAUTH_PROVIDER_GUIDE.md)
- [開発ガイド](../development/README.md)