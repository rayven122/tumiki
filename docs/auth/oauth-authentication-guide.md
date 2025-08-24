# Tumiki ProxyServer OAuth 2.0認証システム ドキュメント

## 概要

Tumiki ProxyServerは、Auth0を活用した堅牢なOAuth 2.0認証システムと、既存のAPIキー認証を組み合わせたハイブリッド認証システムを実装しています。このシステムにより、生成AIサービス（Claude、ChatGPT等）がMCPサーバーに安全に接続できます。

## アーキテクチャ全体図

```mermaid
graph TB
    subgraph "クライアント層"
        AI[生成AIサービス<br/>Claude/ChatGPT]
        DEV[開発者ツール<br/>MCP Inspector]
    end

    subgraph "Tumiki ProxyServer"
        REG["/oauth/register<br/>クライアント登録"]
        TOKEN["/oauth/token<br/>トークン発行"]
        MCP["/mcp/{instanceId}<br/>MCPプロキシ"]
        SSE["/sse/{instanceId}<br/>SSE接続"]
        AUTH[認証ミドルウェア<br/>integratedAuth]
    end

    subgraph "データ層"
        DB[(PostgreSQL<br/>McpApiKey)]
        A0[Auth0<br/>M2M App]
    end

    subgraph "バックエンド"
        MCPS[MCPサーバー群]
    end

    AI -->|1. 登録| REG
    REG -->|保存| DB
    AI -->|2. トークン取得| TOKEN
    TOKEN -->|検証| DB
    TOKEN -->|M2M認証| A0
    AI -->|3. API呼び出し| MCP
    AI -->|3. SSE接続| SSE
    MCP --> AUTH
    SSE --> AUTH
    AUTH -->|転送| MCPS
```

## 認証フロー

### 1. Dynamic Client Registration (DCR)フロー

```mermaid
sequenceDiagram
    participant Client as AIサービス
    participant Proxy as ProxyServer
    participant DB as PostgreSQL
    participant Auth0 as Auth0

    Note over Client,Auth0: クライアント登録フロー
    Client->>Proxy: POST /oauth/register<br/>{client_name, user_id, mcp_server_instance_id}
    Proxy->>DB: MCPサーバーインスタンス確認
    DB-->>Proxy: インスタンス情報
    Proxy->>Proxy: client_id生成<br/>client_secret生成
    Proxy->>DB: McpApiKeyテーブルに保存
    Proxy-->>Client: 201 Created<br/>{client_id, client_secret}

    Note over Client,Auth0: トークン取得フロー
    Client->>Proxy: POST /oauth/token<br/>{grant_type: "client_credentials",<br/>client_id, client_secret}
    Proxy->>DB: クライアント認証
    DB-->>Proxy: 認証成功
    Proxy->>Auth0: M2Mトークン取得
    Auth0-->>Proxy: access_token
    Proxy-->>Client: {access_token, expires_in}

    Note over Client,Auth0: API利用フロー
    Client->>Proxy: POST /mcp/{instanceId}<br/>Authorization: Bearer {token}
    Proxy->>Proxy: JWT検証
    Proxy->>MCPS: MCPリクエスト転送
    MCPS-->>Proxy: レスポンス
    Proxy-->>Client: MCPレスポンス
```

### 2. APIキー認証フロー

```mermaid
sequenceDiagram
    participant Client as クライアント
    participant Proxy as ProxyServer
    participant DB as PostgreSQL
    participant MCP as MCPサーバー

    Note over Client,MCP: APIキー認証フロー
    Client->>Proxy: POST /mcp/{instanceId}<br/>X-API-Key: {api_key}
    Proxy->>DB: APIキー検証
    DB-->>Proxy: 認証成功<br/>ユーザー情報
    Proxy->>MCP: リクエスト転送
    MCP-->>Proxy: レスポンス
    Proxy-->>Client: MCPレスポンス
```

## エンドポイント詳細

### OAuth 2.0エンドポイント

#### 1. **POST /oauth/register** - クライアント登録

**目的**: OAuth 2.0クライアントの動的登録（DCR）

**リクエスト**:

```json
{
  "client_name": "My AI Assistant",
  "user_id": "user_123",
  "mcp_server_instance_id": "instance_456",
  "grant_types": ["client_credentials"]
}
```

**レスポンス** (201 Created):

```json
{
  "client_id": "client_a1b2c3d4e5f6",
  "client_secret": "secret_xyz789...",
  "client_id_issued_at": 1734567890,
  "client_secret_expires_at": 0,
  "client_name": "My AI Assistant",
  "grant_types": ["client_credentials"],
  "response_types": ["token"],
  "scope": "mcp:access",
  "token_endpoint_auth_method": "client_secret_post",
  "mcp_server_instance_id": "instance_456"
}
```

**処理内容**:

- MCPサーバーインスタンスの存在確認
- authTypeがOAUTHまたはBOTHであることを確認
- client_idとclient_secretの生成
- McpApiKeyテーブルへの保存（暗号化）

#### 2. **POST /oauth/token** - アクセストークン取得

**目的**: Client Credentials Grantによるアクセストークン取得

**リクエスト**:

```json
{
  "grant_type": "client_credentials",
  "client_id": "client_a1b2c3d4e5f6",
  "client_secret": "secret_xyz789...",
  "scope": "mcp:access"
}
```

**レスポンス** (200 OK):

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "scope": "mcp:access",
  "mcp_server_instance_id": "instance_456"
}
```

**処理内容**:

- client_id/client_secretの検証（McpApiKey）
- Auth0 M2Mトークンの取得
- トークンの返却

#### 3. **GET /.well-known/oauth-authorization-server** - OAuth Discovery

**目的**: OAuth 2.0 Authorization Server Metadata（RFC 8414準拠）

**レスポンス**:

```json
{
  "issuer": "https://your-tenant.auth0.com/",
  "authorization_endpoint": "https://your-tenant.auth0.com/authorize",
  "token_endpoint": "https://your-tenant.auth0.com/oauth/token",
  "jwks_uri": "https://your-tenant.auth0.com/.well-known/jwks.json",
  "grant_types_supported": ["client_credentials", "authorization_code"],
  "token_endpoint_auth_methods_supported": ["client_secret_post"],
  "scopes_supported": ["openid", "profile", "email", "mcp:access"],
  "code_challenge_methods_supported": ["S256", "plain"]
}
```

### MCPプロキシエンドポイント

#### 4. **POST /mcp/{userMcpServerInstanceId}** - MCPリクエスト（RESTful）

**認証方式**:

- APIキー: `X-API-Key: {api_key}`ヘッダー
- OAuth: `Authorization: Bearer {token}`ヘッダー

**例**:

```bash
# OAuth認証
curl -X POST https://server.tumiki.cloud/mcp/instance_456 \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# APIキー認証
curl -X POST https://server.tumiki.cloud/mcp/instance_456 \
  -H "X-API-Key: tumiki_api_key_xyz..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

#### 5. **GET /sse/{userMcpServerInstanceId}** - SSE接続

**認証方式**: MCPエンドポイントと同様

**例**:

```bash
# SSE接続の確立
curl -N https://server.tumiki.cloud/sse/instance_456 \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."
```

#### 6. **POST /messages/{userMcpServerInstanceId}** - SSEメッセージ送信

**認証方式**: MCPエンドポイントと同様

## 認証タイプ（authType）

各MCPサーバーインスタンスは以下の認証タイプを設定できます：

| authType  | 説明                 | 利用可能な認証方式       |
| --------- | -------------------- | ------------------------ |
| `API_KEY` | APIキー認証のみ      | X-API-Keyヘッダー        |
| `OAUTH`   | OAuth認証のみ        | Bearerトークン           |
| `BOTH`    | 両方の認証方式を許可 | （未実装）               |
| `NONE`    | 認証不要             | （セキュリティ上無効化） |

## データモデル

### McpApiKeyテーブル（クライアント情報管理）

```prisma
model McpApiKey {
  id                       String    @id @default(cuid())
  name                     String    // クライアント名
  apiKey                   String    @unique // client_idとして使用
  apiKeyHash               String?   @unique // client_secretのハッシュ
  isActive                 Boolean   @default(true)
  lastUsedAt               DateTime?
  expiresAt                DateTime?
  userMcpServerInstanceId  String    // MCPサーバーインスタンス
  userId                   String    // 所有者
}
```

### UserMcpServerInstanceテーブル

```prisma
model UserMcpServerInstance {
  id           String    @id @default(cuid())
  name         String
  authType     AuthType  @default(API_KEY)
  userId       String
  // ... その他のフィールド
}
```

## セキュリティ実装

### 1. クライアント認証情報の保護

- client_id: データベースで暗号化保存（@encrypted）
- client_secret: bcryptハッシュ化（ソルト付き）
- APIキー: 32バイトのランダム値（base64url）

### 2. トークン管理

- Auth0 M2Mトークン使用
- JWT形式（RS256署名）
- 有効期限: 24時間（デフォルト）

### 3. レート制限（推奨）

```javascript
// 登録エンドポイント
- 1ユーザーあたり: 10回/時間
- IPアドレスあたり: 100回/時間

// トークンエンドポイント
- クライアントあたり: 100回/時間
```

## 使用例

### JavaScript/TypeScript

```typescript
// 1. クライアント登録
const registerResponse = await fetch(
  "https://server.tumiki.cloud/oauth/register",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "My MCP Client",
      user_id: "user_123",
      mcp_server_instance_id: "instance_456",
      grant_types: ["client_credentials"],
    }),
  },
);
const { client_id, client_secret } = await registerResponse.json();

// 2. トークン取得
const tokenResponse = await fetch("https://server.tumiki.cloud/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "client_credentials",
    client_id,
    client_secret,
    scope: "mcp:access",
  }),
});
const { access_token } = await tokenResponse.json();

// 3. MCPサーバーへのアクセス
const mcpResponse = await fetch(
  "https://server.tumiki.cloud/mcp/instance_456",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 1,
    }),
  },
);
```

### Python

```python
import requests

# 1. クライアント登録
register_response = requests.post(
    'https://server.tumiki.cloud/oauth/register',
    json={
        'client_name': 'Python MCP Client',
        'user_id': 'user_123',
        'mcp_server_instance_id': 'instance_456',
        'grant_types': ['client_credentials']
    }
)
client_credentials = register_response.json()

# 2. トークン取得
token_response = requests.post(
    'https://server.tumiki.cloud/oauth/token',
    json={
        'grant_type': 'client_credentials',
        'client_id': client_credentials['client_id'],
        'client_secret': client_credentials['client_secret']
    }
)
token_data = token_response.json()

# 3. MCPサーバーへのアクセス
mcp_response = requests.post(
    'https://server.tumiki.cloud/mcp/instance_456',
    headers={'Authorization': f"Bearer {token_data['access_token']}"},
    json={
        'jsonrpc': '2.0',
        'method': 'tools/list',
        'id': 1
    }
)
```

## エラーレスポンス

### OAuth 2.0標準エラー

| エラーコード             | 説明                           | HTTPステータス |
| ------------------------ | ------------------------------ | -------------- |
| `invalid_request`        | 必須パラメータ不足             | 400            |
| `invalid_client`         | クライアント認証失敗           | 401            |
| `unsupported_grant_type` | サポートされていないgrant_type | 400            |
| `invalid_scope`          | 無効なスコープ                 | 400            |
| `server_error`           | サーバー内部エラー             | 500            |

### MCP固有エラー

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Authentication required"
  },
  "id": null
}
```

## 移行ガイド

### APIキーからOAuthへの移行

1. **MCPサーバーインスタンスのauthType変更**

```sql
UPDATE UserMcpServerInstance
SET authType = 'OAUTH'
WHERE id = 'your_instance_id';
```

2. **クライアント登録とトークン取得**
   上記の使用例を参照

3. **リクエストヘッダーの変更**

```diff
- "X-API-Key": "your_api_key"
+ "Authorization": "Bearer your_access_token"
```

## トラブルシューティング

| 問題             | 原因                | 解決方法                     |
| ---------------- | ------------------- | ---------------------------- |
| 401 Unauthorized | トークン期限切れ    | 新しいトークンを取得         |
| 404 Not Found    | 間違ったinstance ID | URLパスを確認                |
| 400 Bad Request  | 必須パラメータ不足  | リクエストボディを確認       |
| 403 Forbidden    | authType不一致      | サーバーのauthType設定を確認 |

## まとめ

Tumiki ProxyServerのOAuth 2.0認証システムは、標準準拠のDynamic Client Registration (DCR)とClient Credentials Grantフローを実装しています。これにより、生成AIサービスや開発ツールが安全にMCPサーバーにアクセスできます。既存のAPIキー認証との互換性も維持しており、段階的な移行が可能です。
