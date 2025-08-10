# MCP Proxy Server

複数の MCP サーバーを統合管理するプロキシサーバー

## 概要

Model Context Protocol (MCP) サーバーを統合的に管理するプロキシサーバーです。Streamable HTTP transportとSSE transportの両方をサポートします。

## インストール

依存関係のインストール:

```bash
pnpm install
```

## 使用方法

```bash
# 開発サーバー起動
pnpm start

# 本番サーバー起動（PM2使用）
pnpm start:prod

# 検証
pnpm verify
```

## API エンドポイント

### RESTful エンドポイント（推奨）

MCPサーバーIDを直接URLパスに指定する新しいエンドポイント：

#### Streamable HTTP Transport

- **エンドポイント**: `http://localhost:8080/mcp/{mcpServerInstanceId}`
- **メソッド**: GET, POST, DELETE
- **認証**: authTypeに応じてAPIキーまたはOAuth

```bash
# APIキー認証（authType=API_KEY）
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# OAuth認証（authType=OAUTH）
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

#### SSE Transport

- **エンドポイント**: `http://localhost:8080/sse/{mcpServerInstanceId}`
- **メソッド**: GET（SSE接続確立）
- **メッセージ送信**: `http://localhost:8080/messages/{mcpServerInstanceId}`

### レガシーエンドポイント（後方互換性）

APIキーからMCPサーバーを特定する従来のエンドポイント：

#### Streamable HTTP Transport

- **エンドポイント**: `http://localhost:8080/mcp`
- **メソッド**: GET, POST, DELETE
- **認証**: APIキー（クエリパラメータ、ヘッダー、またはBearer token）

```bash
curl -X POST http://localhost:8080/mcp?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

#### SSE Transport

- **エンドポイント**: `http://localhost:8080/sse`
- **メソッド**: GET
- **認証**: APIキー

## クイックスタート

```bash
# ProxyServer起動
pnpm start

# MCP Inspector検証（APIキーが必要）
TEST_API_KEY=your-api-key pnpm verify
```

## 認証

ProxyServerは複数の認証方式をサポートしています。各MCPサーバーインスタンスのauthTypeフィールドに基づいて認証方式が決定されます。

### 認証タイプ（authType）

1. **API_KEY**: APIキー認証のみ許可
2. **OAUTH**: OAuth2.0/JWT認証のみ許可
3. **NONE**: セキュリティ上の理由で403エラー（使用不可）
4. **BOTH**: 現在未対応（501エラー）

### APIキー認証（authType=API_KEY）

APIキーの指定方法：

1. **X-API-Keyヘッダー（推奨）**

   ```bash
   X-API-Key: your-api-key
   ```

2. **api-keyヘッダー（レガシー）**

   ```bash
   api-key: your-api-key
   ```

3. **クエリパラメータ（レガシー）**
   ```bash
   ?api-key=your-api-key
   ```

### OAuth認可（authType=OAUTH）

2つの方法でOAuth認可が可能です：

#### 方法1: 直接Auth0 M2Mトークンを使用（Client Credentials Grant）

マシン間通信に適したOAuth 2.0 Client Credentials Grantフローを使用します。

1. **M2Mトークンの取得**

   ```bash
   curl -X POST https://YOUR_AUTH0_M2M_DOMAIN/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "client_id": "YOUR_M2M_CLIENT_ID",
       "client_secret": "YOUR_M2M_CLIENT_SECRET",
       "audience": "https://YOUR_AUTH0_DOMAIN/api",
       "grant_type": "client_credentials"
     }'
   ```

2. **Bearer tokenの使用**
   ```bash
   Authorization: Bearer YOUR_M2M_TOKEN
   ```

#### 方法2: Dynamic Client Registration (DCR)

Tumikiプロキシサーバーは、RFC 7591準拠の簡易的なDynamic Client Registration APIを提供しています。これにより、プログラムから動的にOAuthクライアントを作成し、Client Credentials Grantフローでトークンを取得できます。マシン間通信のユースケースに最適化されています。

1. **クライアント登録**

   ```bash
   curl -X POST http://localhost:8080/oauth/register \
     -H "Content-Type: application/json" \
     -d '{
       "client_name": "My MCP Client",
       "user_id": "user_123",
       "mcp_server_instance_id": "instance_456",
       "grant_types": ["client_credentials"]
     }'
   ```

   レスポンス:

   ```json
   {
     "client_id": "client_xxxxx",
     "client_secret": "secret_xxxxx",
     "client_name": "My MCP Client",
     "grant_types": ["client_credentials"],
     "token_endpoint_auth_method": "client_secret_post"
   }
   ```

2. **トークン取得**

   ```bash
   curl -X POST http://localhost:8080/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "client_credentials",
       "client_id": "client_xxxxx",
       "client_secret": "secret_xxxxx",
       "scope": "mcp:access"
     }'
   ```

   レスポンス:

   ```json
   {
     "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "Bearer",
     "expires_in": 86400,
     "scope": "mcp:access"
   }
   ```

3. **MCPエンドポイントへのアクセス**

   ```bash
   curl -X POST http://localhost:8080/mcp/{mcp_server_instance_id} \
     -H "Authorization: Bearer {access_token}" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

### Auth0設定

環境変数に以下を設定：

```env
# Auth0設定
AUTH0_DOMAIN=your-auth0-domain.com
AUTH0_M2M_DOMAIN=your-tenant.auth0.com

# M2Mクライアント設定
AUTH0_M2M_CLIENT_ID=your-m2m-client-id
AUTH0_M2M_CLIENT_SECRET=your-m2m-client-secret
```

### OAuthディスカバリー

Auth0設定情報は以下のエンドポイントから取得可能：

- `/.well-known/oauth-authorization-server`
- `/.well-known/openid-configuration`

### セッション管理

- セッションIDは `mcp-session-id` ヘッダーで管理
- セッションは一定時間（デフォルト5分）でタイムアウト
- 各セッションはMCPサーバーとの永続的な接続を保持

## 技術スタック

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Transport**: @modelcontextprotocol/sdk
- **Process Manager**: PM2
- **Language**: TypeScript
- **ロギング**: Winston
- **メトリクス**: 内蔵メトリクスシステム
