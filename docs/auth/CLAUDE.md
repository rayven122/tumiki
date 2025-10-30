# 認証・認可ドキュメント

Tumiki の認証・認可システムに関するドキュメント。

## 📋 ドキュメント一覧

### Auth0 関連
- [Auth0 MCP Server Authentication](./auth0-mcp-server-authentication.md) - Auth0 を使用した MCP サーバー認証
- [Auth0 Post-Login Setup](./auth0/auth0-post-login-setup.md) - Auth0 ログイン後の設定

### OAuth 実装
- [OAuth Documentation Index](./oauth/OAUTH_DOCUMENTATION_INDEX.md) - OAuth ドキュメントの索引
- [OAuth Implementation](./oauth/OAUTH_IMPLEMENTATION.md) - OAuth 実装ガイド
- [OAuth Access Token Guide](./oauth/OAUTH_ACCESS_TOKEN_GUIDE.md) - アクセストークン管理
- [OAuth Provider Guide](./oauth/OAUTH_PROVIDER_GUIDE.md) - OAuth プロバイダー設定
- [OAuth Separate App Guide](./oauth/OAUTH_SEPARATE_APP_GUIDE.md) - 独立アプリケーションでの OAuth

### 認証設計
- [Two-Tier OAuth Architecture](./two-tier-oauth-architecture.md) - 二層OAuth認証アーキテクチャ（推奨）
- [Two-Tier OAuth Implementation Plan](./two-tier-oauth-implementation-plan.md) - 二層OAuth認証実装計画
- [MCP OAuth Authentication Design](./mcp-oauth-authentication-design.md) - MCP OAuth認証実装設計
- [MCP Compliant Auth Design](./mcp-compliant-auth-design.md) - MCP 準拠の認証設計
- [OAuth Authentication Guide](./oauth-authentication-guide.md) - OAuth 認証ガイド

## 🔐 認証アーキテクチャ

### 認証プロバイダー
- **Auth0** - メイン認証プロバイダー
- **OAuth 2.0** - 外部サービス連携
- **JWT** - トークンベース認証

### セキュリティ機能
- フィールドレベル暗号化
- ロールベースアクセス制御
- セッション管理
- API キー管理

## 🔄 実装フロー
1. Auth0 による認証
2. JWT トークン発行
3. セッション確立
4. API アクセス制御

## 📝 関連リソース
- [セキュリティドキュメント](../security/CLAUDE.md)
- [API キー認証](../auth/apikey-auth.md)