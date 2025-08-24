# 認証関連ドキュメント

このディレクトリには、Tumiki ProxyServerおよびManagerの認証システムに関するドキュメントが含まれています。

## ディレクトリ構造

```
auth/
├── README.md                            # このファイル
├── mcp-compliant-auth-design.md         # MCP仕様準拠OAuth 2.0設計書
├── oauth-authentication-guide.md        # OAuth 2.0実装ガイド
├── auth0-mcp-server-authentication.md  # Auth0 MCPサーバー認証
├── oauth/                               # OAuth関連（旧実装）
│   ├── OAUTH_DOCUMENTATION_INDEX.md    # OAuthドキュメントの索引
│   ├── OAUTH_ACCESS_TOKEN_GUIDE.md     # エンドユーザー向けガイド
│   ├── OAUTH_IMPLEMENTATION.md         # 技術実装詳細
│   ├── OAUTH_PROVIDER_GUIDE.md         # プロバイダー追加ガイド
│   └── OAUTH_SEPARATE_APP_GUIDE.md     # Auth0構成管理ガイド
└── auth0/                               # Auth0固有の設定
    ├── auth0-post-login-action.js      # Post-Loginアクション
    └── auth0-post-login-setup.md       # Post-Login設定ガイド
```

## 認証システム概要

Tumikiは、MCP（Model Context Protocol）仕様に準拠した堅牢な認証システムを実装しています。

### 主要な認証方式

#### 1. OAuth 2.0認証（MCP仕様準拠）
- **仕様**: [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)準拠
- **主要機能**:
  - Dynamic Client Registration (DCR) - RFC 7591準拠
  - Authorization Code Flow with PKCE - OAuth 2.1準拠
  - Client Credentials Flow - サービス間認証
  - Resource Indicators - RFC 8707準拠
- **詳細**: [mcp-compliant-auth-design.md](./mcp-compliant-auth-design.md)

#### 2. APIキー認証（後方互換性）
- 既存のMCPクライアント向けのシンプルな認証
- `X-API-Key`ヘッダーまたは`api-key`クエリパラメータ
- OAuth 2.0への段階的移行をサポート

#### 3. Auth0統合認証
- ユーザー認証とM2M（Machine-to-Machine）認証
- Auth0の10クライアント制限を回避するプロキシアーキテクチャ
- 詳細: [auth0-mcp-server-authentication.md](./auth0-mcp-server-authentication.md)

## アーキテクチャ

### OAuth 2.0プロキシアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      Tumiki Platform                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Auth0     │  │ Tumiki OAuth │  │   Database   │     │
│  │  (1-2 Apps)  │◄─┤    Proxy     │◄─┤  (OAuth DB)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ▲                 ▲                                 │
│         │                 │                                 │
│  ┌──────┼─────────────────┼────────────────────────┐       │
│  │      │  OAuth Proxy Layer                       │       │
│  │      │  - Client Management                     │       │
│  │      │  - Token Management                      │       │
│  │      │  - Authorization Proxy                   │       │
│  └──────┼─────────────────┼────────────────────────┘       │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
┌─────────┼─────────────────┼─────────────────────────────────┐
│         ▼                 ▼        MCP Components           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │MCP Client   │  │  Resource    │  │MCP Server    │     │
│  │(Inspector)  │──┤   Server     │──┤Instance      │     │
│  └─────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## クイックスタート

### MCPクライアント開発者向け

1. **クライアント登録** (Dynamic Client Registration)
```bash
curl -X POST https://auth.tumiki.cloud/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My MCP Client",
    "redirect_uris": ["http://localhost:6274/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "scope": "mcp:read mcp:write"
  }'
```

2. **トークン取得** (Client Credentials Flow)
```bash
curl -X POST https://auth.tumiki.cloud/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "resource": "https://server.tumiki.cloud/mcp/{instance_id}"
  }'
```

3. **MCPサーバーアクセス**
```bash
curl -X POST https://server.tumiki.cloud/mcp/{instance_id} \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

詳細は[oauth-authentication-guide.md](./oauth-authentication-guide.md)を参照してください。

## Discovery Endpoints

### OAuth Protected Resource Metadata
- **URL**: `GET /.well-known/oauth-protected-resource`
- **用途**: MCPサーバーの認証要件を発見

### OAuth Authorization Server Metadata
- **URL**: `GET /.well-known/oauth-authorization-server`
- **用途**: OAuth 2.0サーバーの機能を発見

## セキュリティ機能

### 必須セキュリティ要件
- **PKCE (RFC 7636)**: Authorization Code Flowで必須
- **短期間トークン**: アクセストークンは15分で期限切れ
- **Rate Limiting**: 各エンドポイントでレート制限
- **暗号化**: 機密データはフィールドレベルで暗号化
- **監査ログ**: すべての認証イベントを記録

### 推奨セキュリティ強化
- **KMS統合**: AWS KMS、Azure Key Vault等でキー管理
- **Argon2id**: パスワードハッシュアルゴリズムの推奨
- **サーキットブレーカー**: Auth0障害時の自動フォールバック
- **高可用性**: Active/Active構成での冗長化

## 環境変数

### ProxyServer (OAuth 2.0)
```bash
# Auth0設定
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret

# JWT署名
JWT_PRIVATE_KEY=your_private_key
JWT_PUBLIC_KEY=your_public_key

# データベース
DATABASE_URL=postgresql://...
```

### Manager (旧OAuth実装)
```bash
# メイン認証
AUTH0_SECRET=session_secret
AUTH0_CLIENT_ID=main_client_id
AUTH0_CLIENT_SECRET=main_client_secret

# OAuth認証（外部プロバイダー）
AUTH0_OAUTH_CLIENT_ID=oauth_client_id
AUTH0_OAUTH_CLIENT_SECRET=oauth_client_secret

# Management API
AUTH0_M2M_CLIENT_ID=m2m_client_id
AUTH0_M2M_CLIENT_SECRET=m2m_client_secret
```

## 関連ドキュメント

### 設計・仕様
- [MCP仕様準拠OAuth 2.0設計書](./mcp-compliant-auth-design.md) - 包括的な技術設計書
- [OAuth 2.0認証システムガイド](./oauth-authentication-guide.md) - 実装概要とAPI仕様

### 実装・設定
- [Auth0 Post-Login設定](./auth0/auth0-post-login-setup.md) - Auth0のWebhook設定
- [Auth0 MCPサーバー認証](./auth0-mcp-server-authentication.md) - Auth0統合の詳細

### 旧実装（参考）
- [OAuth実装詳細](./oauth/OAUTH_IMPLEMENTATION.md) - Manager用OAuth実装
- [OAuthプロバイダー追加](./oauth/OAUTH_PROVIDER_GUIDE.md) - 外部プロバイダー統合

## トラブルシューティング

### よくある問題

1. **`invalid_resource`エラー**
   - 原因: リソースパラメータが不正または未指定
   - 解決: 正しい形式のリソースURI（`https://server.tumiki.cloud/mcp/{instance_id}`）を指定

2. **`invalid_client`エラー**
   - 原因: クライアント認証失敗
   - 解決: client_idとclient_secretが正しいか確認

3. **トークン期限切れ**
   - 原因: アクセストークンの15分制限
   - 解決: リフレッシュトークンで新しいトークンを取得

詳細は各ドキュメントのトラブルシューティングセクションを参照してください。

## 関連コード

- `/apps/proxyServer/src/routes/oauth/` - OAuth 2.0エンドポイント実装
- `/apps/proxyServer/src/middleware/integratedAuth.ts` - 統合認証ミドルウェア
- `/packages/auth/` - 認証関連のコアパッケージ
- `/packages/db/prisma/schema/` - 認証関連のデータベーススキーマ