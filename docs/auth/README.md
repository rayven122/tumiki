# 認証関連ドキュメント

このディレクトリには、Tumiki MCP Managerの認証システムに関するドキュメントが含まれています。

## ディレクトリ構造

```
auth/
├── README.md                    # このファイル
├── oauth/                       # OAuth認証関連
│   ├── OAUTH_DOCUMENTATION_INDEX.md    # OAuthドキュメントの索引
│   ├── OAUTH_ACCESS_TOKEN_GUIDE.md     # エンドユーザー向けガイド
│   ├── OAUTH_IMPLEMENTATION.md         # 技術実装詳細
│   ├── OAUTH_PROVIDER_GUIDE.md         # プロバイダー追加ガイド
│   └── OAUTH_SEPARATE_APP_GUIDE.md     # Auth0構成管理ガイド
└── auth0/                       # Auth0固有の設定
    ├── auth0-post-login-action.js      # Post-Loginアクション
    └── auth0-post-login-setup.md       # Post-Login設定ガイド
```

## 概要

Tumikiの認証システムは以下の要素で構成されています：

### 1. メインユーザー認証
- Auth0を使用したユーザーログイン/ログアウト
- JWTベースのセッション管理
- ロールベースのアクセス制御

### 2. OAuth認証（外部サービス連携）
- Google、GitHub、Slack等の外部サービスとの連携
- MCPサーバーが自動的にアクセストークンを利用
- 専用のAuth0アプリケーションで管理

### 3. APIキー認証
- MCPサーバー固有のAPIキー管理
- 暗号化されたフィールドレベルセキュリティ

## クイックリンク

### エンドユーザー向け
- [OAuthアクセストークンの取得方法](./oauth/OAUTH_ACCESS_TOKEN_GUIDE.md)

### 開発者向け
- [OAuth認証の技術実装](./oauth/OAUTH_IMPLEMENTATION.md)
- [新しいOAuthプロバイダーの追加](./oauth/OAUTH_PROVIDER_GUIDE.md)
- [Auth0 Post-Loginアクションの設定](./auth0/auth0-post-login-setup.md)

### システム管理者向け
- [OAuth用Auth0アプリケーションの分離](./oauth/OAUTH_SEPARATE_APP_GUIDE.md)

## 認証フロー

### メインユーザー認証フロー
```
ユーザー → /auth/login → Auth0 → /api/auth/callback/auth0 → セッション作成
```

### OAuth認証フロー（外部サービス連携）
```
ユーザー → /oauth/auth/login → Auth0 → プロバイダー → /oauth/auth/callback → トークン保存
```

## 環境変数

### メイン認証
- `AUTH0_DOMAIN`: Auth0テナントドメイン
- `AUTH0_CLIENT_ID`: メインアプリケーションのClient ID
- `AUTH0_CLIENT_SECRET`: メインアプリケーションのClient Secret
- `AUTH0_SECRET`: セッション暗号化シークレット

### OAuth認証
- `AUTH0_OAUTH_CLIENT_ID`: OAuth専用アプリケーションのClient ID
- `AUTH0_OAUTH_CLIENT_SECRET`: OAuth専用アプリケーションのClient Secret

### Management API
- `AUTH0_M2M_CLIENT_ID`: Management API用のClient ID
- `AUTH0_M2M_CLIENT_SECRET`: Management API用のClient Secret

## セキュリティ考慮事項

1. **トークンの保護**
   - アクセストークンはAuth0が管理
   - データベースには保存しない
   - ProxyServerが自動的に環境変数として注入

2. **スコープの最小化**
   - 必要最小限のスコープのみを要求
   - ユーザーが明示的に承認

3. **認証の分離**
   - メインユーザー認証とOAuth認証は別々のAuth0アプリケーションで管理
   - セキュリティと管理性の向上

## トラブルシューティング

問題が発生した場合は、以下のドキュメントを参照してください：

- [OAuthアクセストークン取得ガイド - トラブルシューティング](./oauth/OAUTH_ACCESS_TOKEN_GUIDE.md#トラブルシューティング)
- [OAuth実装ガイド - トラブルシューティング](./oauth/OAUTH_IMPLEMENTATION.md#トラブルシューティング)

## 関連コード

- `/packages/auth/` - 認証関連のコアパッケージ
- `/apps/manager/src/server/api/routers/oauth/` - OAuth API実装
- `/apps/manager/src/middleware.ts` - 認証ミドルウェア