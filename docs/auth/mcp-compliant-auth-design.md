# MCP仕様準拠認証システム設計書

## 1. 概要

### 1.1 背景と目的

Tumikiプラットフォームは、Model Context Protocol (MCP) 仕様に準拠した認証システムを実装することで、MCP Inspectorを含むサードパーティのMCPクライアントとのシームレスな統合を実現します。

**重要な制約**: Auth0の無料プランでは最大10クライアントまでしか作成できないため、TumikiがOAuthプロキシとして機能し、独自のクライアント管理層を実装します。

**認証方式の二重サポート**: Tumikiは以下の2つの認証方式を完全にサポートします：

- **APIキー認証** (`authType: API_KEY`): Client Credentials Flowに相当し、サービス間認証やCI/CD環境での利用に最適
- **OAuth認証** (`authType: OAUTH`): Authorization Code Flow + PKCEによるユーザー認証、対話型アプリケーションに最適

### 1.2 設計原則

- **MCP仕様準拠**: [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) に完全準拠
- **OAuth 2.1準拠**: 最新のOAuth 2.1仕様（RFC 9126）に基づく実装、Implicit Flow廃止
- **セキュリティファースト**: PKCE必須、15分の短期間トークン、Rate Limiting、nonce実装
- **開発者体験**: Dynamic Client Registrationによる簡単な統合、APIキーとOAuthの選択可能
- **高可用性**: 冗長化構成、障害対策、サーキットブレーカー実装
- **後方互換性**: 既存のAPIキー認証を維持しつつ、OAuth認証を追加

### 1.3 対象読者

- Tumiki開発チーム
- MCPクライアント開発者
- セキュリティ監査担当者

## 2. アーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                      Tumiki Platform                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Auth0     │  │ Tumiki Auth  │  │   Database   │     │
│  │  (1-2 Apps)  │◄─┤    Layer     │◄─┤              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ▲                 ▲                                 │
│         │                 │                                 │
│  ┌──────┼─────────────────┼────────────────────────┐       │
│  │      │  Unified Auth Layer                      │       │
│  │      │  - API Key Management (Client Creds)     │       │
│  │      │  - OAuth Proxy (Auth Code + PKCE)        │       │
│  │      │  - Token Management                      │       │
│  │      │  - Session Management                    │       │
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

### 2.2 コンポーネント説明

| コンポーネント      | 責務                                | 実装技術                |
| ------------------- | ----------------------------------- | ----------------------- |
| Auth0               | ユーザー認証のみ（1-2クライアント） | Auth0 SaaS              |
| Tumiki Auth Layer   | 統合認証層（APIキー/OAuth）         | Express.js + TypeScript |
| Database            | 認証情報の永続化                    | PostgreSQL + Prisma     |
| Resource Server     | API Gateway, Token検証              | Express.js + JWT        |
| MCP Client          | MCPプロトコルクライアント           | MCP Inspector等         |
| MCP Server Instance | 実際のMCPサーバー                   | 各種MCP実装             |

### 2.3 認証方式の使い分け

| 認証方式    | AuthType  | 利用シーン                                | 特徴                                           |
| ----------- | --------- | ----------------------------------------- | ---------------------------------------------- |
| APIキー認証 | `API_KEY` | CI/CD、バックエンドサービス、自動化ツール | 長期間有効、簡単な設定、Client Credentials相当 |
| OAuth認証   | `OAUTH`   | Webアプリ、モバイルアプリ、MCP Inspector  | ユーザー認証、短期間トークン、Auth Code + PKCE |


## 3. Discovery Endpoints

### 3.1 OAuth Protected Resource Metadata

**エンドポイント**: `GET /.well-known/oauth-protected-resource`

```json
{
  "resource": "https://server.tumiki.cloud/mcp/{instance_id}",
  "authorization_servers": ["https://auth.tumiki.cloud"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://docs.tumiki.cloud/mcp",
  "resource_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["mcp:read", "mcp:write", "mcp:admin"]
}
```

### 3.2 OAuth Authorization Server Metadata

**エンドポイント**: `GET /.well-known/oauth-authorization-server`

```json
{
  "issuer": "https://auth.tumiki.cloud",
  "authorization_endpoint": "https://auth.tumiki.cloud/oauth/authorize",
  "token_endpoint": "https://auth.tumiki.cloud/oauth/token",
  "registration_endpoint": "https://auth.tumiki.cloud/oauth/register",
  "jwks_uri": "https://auth.tumiki.cloud/.well-known/jwks.json",
  "response_types_supported": ["code"], // OAuth 2.1準拠: Implicit Flow廃止のためtokenレスポンスタイプはサポートしない
  "grant_types_supported": [
    "authorization_code",
    "client_credentials",
    "refresh_token"
  ],
  "token_endpoint_auth_methods_supported": [
    "client_secret_post",
    "client_secret_basic",
    "none"
  ],
  "code_challenge_methods_supported": ["S256"], // PKCE S256のみサポート（plainメソッドは非対応）
  "resource_indicators_supported": true,
  "revocation_endpoint": "https://auth.tumiki.cloud/oauth/revoke",
  "introspection_endpoint": "https://auth.tumiki.cloud/oauth/introspect"
}
```

## 4. Dynamic Client Registration (DCR)

### 4.1 仕様

RFC 7591準拠のDynamic Client Registrationを実装し、MCPクライアントが自動的に登録できるようにします。

**重要**: Auth0の制限により、Tumikiが独自にクライアント管理を行います。実際のAuth0アプリケーションは1-2個のみ作成し、すべてのクライアントで共有します。

### 4.2 遅延バインディング方式によるユーザーID管理

#### 4.2.1 課題

DCR時点ではユーザーが未認証のため、OAuthClientテーブルに必須のuserIdを特定できません。

#### 4.2.2 解決策

**遅延バインディング方式**を採用：

1. **仮登録フェーズ**
   - システムユーザーID（`system_dcr_pending`）で仮登録
   - metadataフィールドに`isPending: true`フラグを設定
   - クライアントは使用可能だが、仮状態として管理

2. **バインディングフェーズ**
   - 初回のAuthorization Code Flow完了時に実行
   - Auth0認証後、実際のユーザーIDを取得
   - クライアントを実ユーザーにバインド
   - MCPサーバーインスタンスとの関連付け

3. **自動クリーンアップ**
   - 30日間バインドされないクライアントは自動削除
   - 監査ログでバインディング履歴を記録

### 4.3 Registration Endpoint

**エンドポイント**: `POST /oauth/register`

**リクエスト例**:

```json
{
  "client_name": "MCP Inspector",
  "client_uri": "https://github.com/modelcontextprotocol/inspector",
  "redirect_uris": ["http://localhost:6274/oauth/callback"],
  "grant_types": ["authorization_code", "client_credentials", "refresh_token"],
  "response_types": ["code"],
  "scope": "mcp:read mcp:write",
  "token_endpoint_auth_method": "client_secret_post",
  // 拡張パラメータ（オプション）
  "mcp_server_instance_id": "cmcy0egw80005o0215bs2g7rr" // MCPサーバーインスタンスIDを指定可能
}
```

**レスポンス例**:

```json
{
  "client_id": "client_2a3b4c5d6e7f8g9h",
  "client_secret": "secret_9h8g7f6e5d4c3b2a1",
  "client_id_issued_at": 1704067200,
  "client_secret_expires_at": 0,
  "client_name": "MCP Inspector",
  "redirect_uris": ["http://localhost:6274/oauth/callback"],
  "grant_types": ["authorization_code", "client_credentials", "refresh_token"],
  "response_types": ["code"],
  "scope": "mcp:read mcp:write",
  "token_endpoint_auth_method": "client_secret_post",

  // 追加情報
  "registration_access_token": "reg_token_xxx",
  "registration_client_uri": "https://auth.tumiki.cloud/oauth/register/client_2a3b4c5d6e7f8g9h"
}
```

### 4.4 Registration Management

登録されたクライアントの管理エンドポイント：

- **GET** `/oauth/register/{client_id}` - クライアント情報取得
- **PUT** `/oauth/register/{client_id}` - クライアント情報更新
- **DELETE** `/oauth/register/{client_id}` - クライアント削除

## 5. 認証フロー

### 5.0 認証方式の選択ロジック

```typescript
// UserMcpServerInstance.authTypeに基づく認証方式の決定
interface AuthTypeDecision {
  determineAuthMethod(authType: AuthType): AuthMethod {
    switch (authType) {
      case 'API_KEY':
        // Client Credentials Flow相当
        // APIキーを直接使用
        return {
          method: 'api_key',
          flow: 'client_credentials',
          requiresUserInteraction: false,
          tokenLifetime: 'long-lived' // ユーザーが明示的に無効化するまで有効
        };

      case 'OAUTH':
        // Authorization Code Flow + PKCE
        // ユーザー認証が必要
        return {
          method: 'oauth',
          flow: 'authorization_code',
          requiresUserInteraction: true,
          tokenLifetime: 'short-lived' // 15分
        };

      default:
        throw new Error('Unsupported auth type');
    }
  }
}
```

### 5.1 Authorization Code Flow with PKCE （OAuth認証: authType = "OAUTH"）

#### 5.1.1 フロー概要

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant B as Browser
    participant TP as Tumiki Proxy
    participant A0 as Auth0
    participant RS as Resource Server
    participant MS as MCP Server

    C->>C: Generate code_verifier & code_challenge
    C->>B: Open browser with authorize URL
    B->>TP: GET /oauth/authorize
    Note over TP: Map client_id to Auth0 app
    TP->>A0: Redirect to Auth0 with state
    A0->>B: Login page
    B->>A0: User credentials
    A0->>TP: Callback with Auth0 code
    Note over TP: Map Auth0 code to client
    TP->>B: Redirect to client callback
    B->>C: Authorization code
    C->>TP: POST /oauth/token with code
    Note over TP: Exchange with Auth0
    TP->>A0: Exchange Auth0 code
    A0->>TP: Auth0 tokens
    Note over TP: Generate Tumiki token
    TP->>C: Access token & Refresh token
    C->>RS: API request with Bearer token
    RS->>TP: Validate token
    RS->>MS: Forward request
    MS->>RS: Response
    RS->>C: Response
```

#### 5.1.2 Authorization Request

**エンドポイント**: `GET /oauth/authorize`

**パラメータ**:

```
https://auth.tumiki.cloud/oauth/authorize?
  response_type=code&
  client_id=client_2a3b4c5d6e7f8g9h&
  redirect_uri=http://localhost:6274/callback&
  scope=mcp:read mcp:write&
  state=abc123&
  nonce=n-0S6_WzA2Mj&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256&
  resource=https://server.tumiki.cloud/mcp/cmcy0egw80005o0215bs2g7rr
```

**重要**: `resource`パラメータは**必須**です（MCP仕様準拠）。

#### 5.1.3 Token Exchange

**エンドポイント**: `POST /oauth/token`

**リクエスト**:

```json
{
  "grant_type": "authorization_code",
  "code": "auth_code_xxx",
  "client_id": "client_2a3b4c5d6e7f8g9h",
  "client_secret": "secret_9h8g7f6e5d4c3b2a1",
  "redirect_uri": "http://localhost:6274/callback",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "resource": "https://server.tumiki.cloud/mcp/cmcy0egw80005o0215bs2g7rr"
}
```

**レスポンス**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900, // 15分
  "refresh_token": "refresh_token_xxx",
  "scope": "mcp:read mcp:write",
  "resource": "https://server.tumiki.cloud/mcp/cmcy0egw80005o0215bs2g7rr"
}
```

### 5.2 APIキー認証フロー （APIキー認証: authType = "API_KEY"）

#### 5.2.1 フロー概要

APIキー認証はClient Credentials Flowに相当し、サービス間認証にM2M通信に使用されます。

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant RS as Resource Server
    participant DB as Database
    participant MS as MCP Server

    C->>RS: Request with API Key header
    RS->>DB: Validate API key
    DB->>RS: Return validation result
    RS->>MS: Forward request
    MS->>RS: Response
    RS->>C: Response
```

#### 5.2.2 APIキーの生成と管理

**エンドポイント**: `POST /api/keys`

**リクエスト**:

```json
{
  "name": "Production API Key",
  "userMcpServerInstanceId": "cmcy0egw80005o0215bs2g7rr",
  "expiresAt": "2025-12-31T23:59:59Z" // オプション
}
```

**レスポンス**:

```json
{
  "id": "key_xxx",
  "name": "Production API Key",
  "apiKey": "tumiki_api_key_9h8g7f6e5d4c3b2a1", // 初回のみ表示
  "createdAt": "2025-01-10T00:00:00Z",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

#### 5.2.3 APIキーを使用したリクエスト

```http
GET /mcp/cmcy0egw80005o0215bs2g7rr/tools/list
X-API-Key: tumiki_api_key_9h8g7f6e5d4c3b2a1
```

または

```http
GET /mcp/cmcy0egw80005o0215bs2g7rr/tools/list
Authorization: Bearer tumiki_api_key_9h8g7f6e5d4c3b2a1
```

### 5.3 Client Credentials Flow （OAuthクライアントのM2M通信）

#### 5.3.1 フロー概要

OAuthクライアントがサービス間認証を行う場合に使用。Dynamic Client Registrationで登録したクライアントが利用。

#### 5.3.2 Token Request

**エンドポイント**: `POST /oauth/token`

**リクエスト**:

```json
{
  "grant_type": "client_credentials",
  "client_id": "client_2a3b4c5d6e7f8g9h",
  "client_secret": "secret_9h8g7f6e5d4c3b2a1",
  "scope": "mcp:read mcp:write",
  "resource": "https://server.tumiki.cloud/mcp/cmcy0egw80005o0215bs2g7rr"
}
```

**レスポンス**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900, // 15分
  "scope": "mcp:read mcp:write",
  "resource": "https://server.tumiki.cloud/mcp/cmcy0egw80005o0215bs2g7rr"
}
```

### 5.4 Refresh Token Flow （OAuthクライアントのトークン更新）

**エンドポイント**: `POST /oauth/token`

**リクエスト**:

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh_token_xxx",
  "client_id": "client_2a3b4c5d6e7f8g9h",
  "client_secret": "secret_9h8g7f6e5d4c3b2a1"
}
```

## 6. Resource Parameter仕様

### 6.1 概要

RFC 8707 (Resource Indicators for OAuth 2.0) に準拠し、`resource`パラメータを実装します。

### 6.2 Resource識別子の形式

```
https://server.tumiki.cloud/mcp/{instance_id}
```

- `{instance_id}`: MCPサーバーインスタンスの一意識別子
- HTTPSスキーム必須
- 正規化されたURI形式

### 6.3 リダイレクトURI検証ルール

#### 6.3.1 本番環境

- **完全一致検証**: 登録されたリダイレクトURIと完全一致する必要あり
- **HTTPSスキーム必須**: `https://` スキームのみ許可
- **カスタムスキーム許可**: モバイルアプリ用（`myapp://callback`）

#### 6.3.2 開発環境

- localhostのHTTPを許可（`http://localhost:*`）
- ポート番号の柔軟な対応
- 127.0.0.1と[::1]も許可

#### 6.3.3 セキュリティ考慮事項

- **オープンリダイレクト攻撃対策**: ワイルドカード不許可
- **サブドメイン攻撃対策**: サブドメインの部分一致不許可
- **ポート番号の厳格な検証**: 本番環境ではポート番号も完全一致

## 7. トークン管理仕様

### 7.1 JWTトークン構造

Auth0から発行されたトークンをTumiki独自のJWTとして再発行します。

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key_id_xxx"
  },
  "payload": {
    "iss": "https://auth.tumiki.cloud",
    "sub": "user_id or client_id",
    "aud": "https://server.tumiki.cloud/mcp",
    "exp": 1704070800,
    "iat": 1704067200,
    "scope": "mcp:read mcp:write",
    "resources": ["https://server.tumiki.cloud/mcp/{instance_id}"],
    "client_id": "client_2a3b4c5d6e7f8g9h",
    "azp": "client_2a3b4c5d6e7f8g9h"
  }
}
```

### 7.2 トークン検証要件

1. **JWT署名検証**: RS256アルゴリズムで署名検証
2. **有効期限確認**: expクレームの検証
3. **Audience検証**: `https://server.tumiki.cloud/mcp`を含むこと
4. **Resource検証**: リクエストされたリソースがトークンに含まれること
5. **Scope検証**: 必要なスコープが含まれること

### 7.3 トークンライフサイクル

| トークンタイプ     | 有効期限 | 更新方法          |
| ------------------ | -------- | ----------------- |
| Access Token       | 15分     | Refresh Token使用 |
| Refresh Token      | 30日     | 再認証必要        |
| Registration Token | 無期限   | -                 |

## 8. API保護仕様

### 8.1 Bearer Token認証

MCP仕様に準拠し、Bearer Token認証を実装します。

#### 8.1.1 WWW-Authenticateヘッダー

認証失敗時には以下のヘッダーを返します：

```
WWW-Authenticate: Bearer realm="MCP", as_uri="https://auth.tumiki.cloud", resource="https://server.tumiki.cloud/mcp"
```

#### 8.1.2 認証フロー

1. AuthorizationヘッダーからBearerトークンを抽出
2. JWTトークンの検証
3. Resourceパラメータの検証
4. Scopeの検証

### 8.2 スコープベースの認可

| スコープ | 許可されるHTTPメソッド |
| --- | --- |
| mcp:read | GET |
| mcp:write | POST, PUT, PATCH |
| mcp:delete | DELETE |
| mcp:admin | すべてのメソッド |

## 9. セキュリティ要件

### 9.1 PKCE (Proof Key for Code Exchange)

Authorization Code Flowでは**必須**実装（OAuth 2.1準拠）

- code_verifier: 43文字以上128文字以下のランダム文字列
- code_challenge: code_verifierのSHA256ハッシュをbase64urlエンコード
- method: S256のみサポート（plainは不許可）

### 9.2 Rate Limiting

| エンドポイント | ウィンドウ | 最大リクエスト数 |
| --- | --- | --- |
| /oauth/register | 15分 | 5 |
| /oauth/token | 15分 | 20 |
| /mcp/* | 1分 | 100 |

### 9.3 セキュリティヘッダー

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- Content-Security-Policy: default-src 'self'

### 9.4 監査ログ要件

以下のイベントを記録：
- クライアント登録
- トークン発行
- トークン更新
- アクセス拒否
- 異常アクセスパターン

### 9.5 暗号化要件

#### 9.5.1 保護対象データ

- OAuthクライアントシークレット
- Auth0アクセストークン
- APIキー
- リフレッシュトークン

#### 9.5.2 推奨KMSソリューション

| KMSプロバイダー  | 特徴                                  |
| ---------------- | ------------------------------------- |
| AWS KMS          | AWSネイティブ統合、FIPS 140-2 Level 2 |
| Azure Key Vault  | Azureネイティブ統合、HSMサポート      |
| HashiCorp Vault  | マルチクラウド対応、動的シークレット  |
| Google Cloud KMS | GCPネイティブ統合、グローバル展開     |

#### 9.5.3 キーローテーションスケジュール

- マスターキー: 1年
- データ暗号化キー: 90日
- 署名キー: 6ヶ月

### 9.6 パスワードハッシュアルゴリズム

- **現在**: bcrypt（コストファクター10）
- **推奨**: Argon2id（メモリ64MB、時間コスト3、並列度1）
- **移行計画**: 新規クライアントはArgon2id、既存は次回更新時に移行

## 10. エラーハンドリング

### 10.1 OAuth エラーレスポンス

```json
{
  "error": "invalid_request",
  "error_description": "The resource parameter is required",
  "error_uri": "https://docs.tumiki.cloud/errors/oauth#invalid_request"
}
```

### 10.2 エラーコード一覧

| エラーコード              | 説明                          | HTTPステータス |
| ------------------------- | ----------------------------- | -------------- |
| invalid_request           | リクエストパラメータ不正      | 400            |
| unauthorized_client       | クライアント認証失敗          | 401            |
| access_denied             | アクセス拒否                  | 403            |
| unsupported_response_type | サポートされないresponse_type | 400            |
| invalid_scope             | 無効なスコープ                | 400            |
| server_error              | サーバーエラー                | 500            |
| temporarily_unavailable   | 一時的に利用不可              | 503            |

## 11. データベース設計

### 11.0 認証系テーブルの関係

```mermaid
erDiagram
    UserMcpServerInstance ||--o{ McpApiKey : "has API keys"
    UserMcpServerInstance ||--o{ OAuthClient : "has OAuth clients"
    UserMcpServerInstance {
        string id PK
        string name
        enum authType "API_KEY | OAUTH"
        string userId FK
    }

    McpApiKey {
        string id PK
        string name
        string apiKey "encrypted"
        string userMcpServerInstanceId FK
        datetime expiresAt "nullable"
    }

    OAuthClient {
        string id PK
        string clientId "unique"
        string clientSecretHash
        string userMcpServerInstanceId FK
        string[] grantTypes
    }

    OAuthToken ||--|| OAuthClient : "belongs to"
    OAuthToken {
        string id PK
        string token "encrypted"
        string clientId FK
        enum tokenType "access | refresh"
        datetime expiresAt
    }
```

### 11.1 統合認証管理

```prisma
// packages/db/prisma/schema/oauth.prisma

// OAuthクライアント情報（OAuth認証用）
model OAuthClient {
  id                    String   @id @default(cuid())
  clientId              String   @unique  // Tumiki生成のクライアントID
  clientSecret          String   /// @encrypted  // 暗号化されたシークレット
  clientSecretHash      String?  @unique /// @encryption:hash(clientSecret)  // ハッシュ化されたシークレット（検証用）
  clientName            String
  clientUri             String?
  redirectUris          String[]          // 許可されたリダイレクトURI
  grantTypes            String[]          // 許可されたグラントタイプ
  responseTypes         String[]          // 許可されたレスポンスタイプ
  scope                 String            // 許可されたスコープ
  tokenEndpointAuthMethod String          // トークンエンドポイント認証方法

  // MCPサーバーインスタンスとの関連（オプショナル - バインディング後に設定）
  userMcpServerInstanceId String?         // MCPサーバーインスタンスID（遅延バインディング）
  userMcpServerInstance UserMcpServerInstance? @relation(fields: [userMcpServerInstanceId], references: [id])

  // ユーザー情報（遅延バインディング対応）
  userId                String            // Tumikiユーザー（初期値: system_dcr_pending）
  user                  User     @relation(fields: [userId], references: [id])
  organizationId        String?           // 組織ID
  organization          Organization? @relation(fields: [organizationId], references: [id])

  // メタデータ（遅延バインディング状態を含む）
  metadata              Json?             // isPending, boundAt, boundToUserId等を含む

  // 管理情報
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  lastUsedAt            DateTime?
  expiresAt             DateTime?         // クライアント有効期限

  // リレーション
  authorizationCodes    OAuthAuthorizationCode[]
  tokens                OAuthToken[]

  @@index([userId])
  @@index([userMcpServerInstanceId])
  @@index([organizationId])
}

// packages/db/prisma/schema/apiKey.prismaは既存のまま維持
// APIキー管理テーブル（API_KEY認証用）
model McpApiKey {
  id                       String                  @id @default(cuid())
  name                     String
  apiKey                   String                  @unique /// @encrypted
  apiKeyHash               String?                 @unique /// @encryption:hash(apiKey)
  isActive                 Boolean                 @default(true)
  lastUsedAt               DateTime?
  expiresAt                DateTime?
  userMcpServerInstanceId  String
  userMcpServerInstance    UserMcpServerInstance   @relation(fields: [userMcpServerInstanceId], references: [id])
  userId                   String
  user                     User                    @relation(fields: [userId], references: [id])
  createdAt                DateTime                @default(now())
  updatedAt                DateTime                @updatedAt
}

// OAuth認可コード
model OAuthAuthorizationCode {
  id                    String   @id @default(cuid())
  code                  String   @unique  // 認可コード
  clientId              String            // OAuthClient.id
  userId                String            // 認証されたユーザー
  redirectUri           String            // 使用されたリダイレクトURI
  scope                 String            // 許可されたスコープ
  state                 String?           // stateパラメータ
  nonce                 String?           // nonceパラメータ（OpenID Connect対応）
  codeChallenge         String?           // PKCE code_challenge
  codeChallengeMethod   String?           // PKCE method (S256)

  // Auth0マッピング
  auth0Code             String?           // Auth0から取得した実際のコード

  // 有効期限
  expiresAt             DateTime          // 10分後
  usedAt                DateTime?         // 使用済みタイムスタンプ

  createdAt             DateTime @default(now())

  // リレーション
  client                OAuthClient @relation(fields: [clientId], references: [id])

  @@index([clientId])
  @@index([userId])
  @@index([expiresAt])
}

// OAuthトークン
model OAuthToken {
  id                    String   @id @default(cuid())
  tokenType             String            // "access" | "refresh"
  token                 String   @unique  // トークン値（JWTまたはopaque）
  clientId              String            // OAuthClient.id
  userId                String?           // ユーザーID（client_credentialsの場合null）
  scope                 String            // トークンのスコープ
  resource              String[]          // リソース識別子（RFC 8707）

  // Auth0マッピング
  auth0AccessToken      String? @db.Text @encrypted  // Auth0の実際のトークン（暗号化）
  auth0RefreshToken     String? @db.Text @encrypted  // Auth0のリフレッシュトークン（暗号化）

  // 有効期限
  expiresAt             DateTime          // トークン有効期限

  // 管理情報
  createdAt             DateTime @default(now())
  lastUsedAt            DateTime?
  revokedAt             DateTime?         // 取り消し日時

  // リレーション
  client                OAuthClient @relation(fields: [clientId], references: [id])

  @@index([clientId])
  @@index([userId])
  @@index([expiresAt])
  @@index([tokenType])
}
```

### 11.2 認証方式の統合管理

#### 11.2.1 UserMcpServerInstanceのauthTypeによる制御

```typescript
// 認証タイプによる動作の切り替え
class AuthenticationManager {
  async validateRequest(
    request: MCPRequest,
    instanceId: string,
  ): Promise<boolean> {
    const instance = await db.userMcpServerInstance.findUnique({
      where: { id: instanceId },
    });

    switch (instance.authType) {
      case "API_KEY":
        return this.validateApiKey(request);

      case "OAUTH":
        return this.validateOAuthToken(request);

      default:
        return false;
    }
  }

  private async validateApiKey(request: MCPRequest): Promise<boolean> {
    const apiKey =
      request.headers["x-api-key"] ||
      request.headers["authorization"]?.replace("Bearer ", "");

    if (!apiKey) return false;

    const result = await validateApiKey(apiKey);
    return result.valid;
  }

  private async validateOAuthToken(request: MCPRequest): Promise<boolean> {
    const token = request.headers["authorization"]?.replace("Bearer ", "");

    if (!token) return false;

    // JWT検証
    return await validateJWT(token);
  }
}
```

#### 11.2.2 認証情報の保存構造

- **APIキー**: `McpApiKey`テーブルに保存（既存）
- **OAuthクライアント**: `OAuthClient`テーブルに保存（新規）
- **共通**: `UserMcpServerInstance.authType`で制御

## 12. 実装計画

### 12.1 フェーズ1: データベース準備（1週間）

- [ ] oauth.prismaファイルの作成（OAuthClient, OAuthAuthorizationCode, OAuthToken）
  - [ ] userMcpServerInstanceIdをオプショナルに変更（遅延バインディング対応）
  - [ ] metadataフィールドにisPending状態を管理する構造を定義
- [ ] システムユーザー（system_dcr_pending）の作成スクリプト
- [ ] Prisma暗号化フィールドの設定
- [ ] 既存McpApiKeyテーブルの維持（後方互換性）
- [ ] UserMcpServerInstanceとのリレーション設定
- [ ] マイグレーションスクリプト作成

### 12.2 フェーズ2: 統合認証層実装（2週間）

- [ ] APIキー管理の拡張
  - [ ] 既存のvalidateApiKeyの維持
  - [ ] authTypeに基づく判定ロジック
  - [ ] APIキー生成/管理APIの改善
- [ ] OAuthプロキシ層
  - [ ] Dynamic Client Registration (DCR)
    - [ ] 仮登録処理の実装（system_dcr_pendingユーザー使用）
    - [ ] メタデータにisPendingフラグの管理
  - [ ] `/oauth/authorize`エンドポイント
  - [ ] `/oauth/token`エンドポイント
    - [ ] 初回認証時のバインディング処理実装
    - [ ] bindClientToUser関数の実装
  - [ ] Auth0とのプロキシ通信
- [ ] integratedAuthMiddlewareの完全実装
  - [ ] BOTHタイプのサポート
  - [ ] 認証方式の自動判定

### 12.3 フェーズ3: Discovery & Metadata（1週間）

- [ ] Discovery Endpoints実装
  - [ ] `/.well-known/oauth-protected-resource`
  - [ ] `/.well-known/oauth-authorization-server`
- [ ] JWKS エンドポイント
- [ ] トークンイントロスペクション

### 12.4 フェーズ4: 認証フロー完全実装（1週間）

- [ ] Authorization Code Flow + PKCE（プロキシ経由）
- [ ] Client Credentials Flow（直接実装）
- [ ] Refresh Token Flow（ハイブリッド）
- [ ] Resource Parameter検証
- [ ] スコープベース認可

### 12.5 フェーズ5: セキュリティ & 監視（1週間）

- [ ] Rate Limiting実装
- [ ] 異常検知システム
- [ ] セキュリティヘッダー
- [ ] ペネトレーションテスト

### 12.6 フェーズ6: 運用準備（1週間）

- [ ] ドキュメント整備
  - [ ] APIキー認証の使用方法
  - [ ] OAuth認証の使用方法
  - [ ] 認証方式の選択ガイド
  - [ ] 遅延バインディングの説明と管理方法
- [ ] SDKサンプル作成
  - [ ] APIキーを使用したサンプル
  - [ ] OAuthを使用したサンプル
  - [ ] DCRからバインディングまでの完全フロー例
- [ ] 監視・アラート設定
  - [ ] 仮登録クライアントの監視
  - [ ] 30日間バインドされないクライアントの自動削除ジョブ
- [ ] 本番環境デプロイ

## 13. プロキシアーキテクチャの詳細

### 13.1 クライアントIDマッピング

```typescript
// Tumikiクライアント → Auth0アプリケーションのマッピング
export const mapToAuth0Client = async (
  tumikiClientId: string,
): Promise<Auth0Credentials> => {
  // すべてのTumikiクライアントは1つのAuth0アプリを共有
  const AUTH0_SHARED_CLIENT_ID = process.env.AUTH0_CLIENT_ID!;
  const AUTH0_SHARED_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET!;

  // クライアント検証
  const client = await db.oAuthClient.findUnique({
    where: { clientId: tumikiClientId, isActive: true },
  });

  if (!client) {
    throw new Error("Invalid client_id");
  }

  // 同じAuth0クライアントを返す
  return {
    clientId: AUTH0_SHARED_CLIENT_ID,
    clientSecret: AUTH0_SHARED_CLIENT_SECRET,
  };
};
```

### 13.2 遅延バインディングの実装

```typescript
// 仮登録とバインディング処理
export const handleDynamicClientRegistration = async (
  request: DCRRequest,
): Promise<DCRResponse> => {
  // システムユーザーの確保
  await ensureSystemUser();
  
  // クライアントIDとシークレット生成
  const clientId = `client_${randomBytes(12).toString("hex")}`;
  const clientSecret = `secret_${randomBytes(24).toString("hex")}`;
  const clientSecretHash = await bcrypt.hash(clientSecret, 10);

  // 仮登録（システムユーザーで登録）
  const client = await db.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash,
      clientName: request.client_name,
      redirectUris: request.redirect_uris,
      userId: "system_dcr_pending", // システムユーザーID
      userMcpServerInstanceId: null, // 後でバインド
      metadata: {
        isPending: true,
        registeredAt: new Date().toISOString(),
        originalRequest: request,
      },
    },
  });

  return {
    client_id: clientId,
    client_secret: clientSecret,
    // ... その他のレスポンスフィールド
  };
};

// トークン交換時のバインディング
export const bindClientToUser = async (
  clientId: string,
  userId: string,
  mcpServerInstanceId?: string,
): Promise<void> => {
  const client = await db.oAuthClient.findUnique({
    where: { clientId },
  });

  if (!client) throw new Error("Client not found");

  const metadata = client.metadata as any;
  if (metadata?.isPending) {
    await db.oAuthClient.update({
      where: { id: client.id },
      data: {
        userId,
        userMcpServerInstanceId: mcpServerInstanceId,
        metadata: {
          ...metadata,
          isPending: false,
          boundAt: new Date().toISOString(),
          boundToUserId: userId,
        },
      },
    });
  }
};
```

### 13.3 トークン生成戦略

```typescript
export const verifyAuth0Token = async (
  auth0Token: string,
  jwksUri: string,
): Promise<Auth0Claims> => {
  // JWKSから公開鍵を取得して検証
  const jwksClient = jwks({ jwksUri });
  const getKey = (header: any, callback: any) => {
    jwksClient.getSigningKey(header.kid, (err, key) => {
      const signingKey = key?.getPublicKey();
      callback(err, signingKey);
    });
  };

  return new Promise((resolve, reject) => {
    jwt.verify(auth0Token, getKey, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded as Auth0Claims);
    });
  });
};

export const generateTumikiToken = async (
  auth0Token: string,
  clientId: string,
  privateKey: string,
): Promise<string> => {
  // Auth0トークンを検証
  const auth0Claims = await verifyAuth0Token(
    auth0Token,
    "https://auth.tumiki.cloud/.well-known/jwks.json",
  );

  // Tumiki独自のJWTを生成
  const tumikiToken = jwt.sign(
    {
      iss: "https://auth.tumiki.cloud",
      sub: auth0Claims.sub, // Auth0のユーザーID
      aud: "https://server.tumiki.cloud/mcp",
      client_id: clientId, // TumikiのクライアントID
      scope: "mcp:read mcp:write",
      auth0_token_id: auth0Claims.jti, // Auth0トークンへの参照
      exp: Math.floor(Date.now() / 1000) + 900, // 15分
    },
    privateKey,
  );

  // トークンをDBに保存
  await db.oAuthToken.create({
    data: {
      token: tumikiToken,
      tokenType: "access",
      clientId: clientId,
      userId: auth0Claims.sub,
      auth0AccessToken: auth0Token, // 暗号化されて保存
      expiresAt: new Date(Date.now() + 900000), // 15分
    },
  });

  return tumikiToken;
};
```

### 13.4 セッション管理

```typescript
// 認可コードのマッピングを管理
// メモリストアをクロージャーで管理
const createAuthorizationSessionStore = () => {
  const sessions = new Map<string, SessionData>();

  const createSession = (
    auth0Code: string,
    clientId: string,
    redirectUri: string,
  ): string => {
    const tumikiCode = crypto.randomBytes(32).toString("hex");

    sessions.set(tumikiCode, {
      auth0Code,
      clientId,
      redirectUri,
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000, // 10分
    });

    // 期限切れセッションのクリーンアップ
    cleanupExpiredSessions(sessions);

    return tumikiCode;
  };

  const exchangeCode = async (tumikiCode: string): Promise<SessionData> => {
    const session = sessions.get(tumikiCode);

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired authorization code");
    }

    sessions.delete(tumikiCode);
    return session;
  };

  return { createSession, exchangeCode };
};

const cleanupExpiredSessions = (sessions: Map<string, SessionData>): void => {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(code);
    }
  }
};

// シングルトンインスタンス
export const authSessionStore = createAuthorizationSessionStore();
```

### 13.5 障害対策

#### 13.5.1 サーキットブレーカー実装

```typescript
class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;

  private readonly config = {
    failureThreshold: 5, // 失敗回数閾値
    successThreshold: 3, // 成功回数閾値（HALF_OPEN→CLOSEDへの復帰）
    timeout: 30000, // オープン状態維持時間（30秒）
    failureRateThreshold: 0.5, // 失敗率閾値（50%）
  };

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime!.getTime() > this.config.timeout) {
        this.state = "HALF_OPEN";
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = "CLOSED";
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
    }
  }
}
```

#### 13.5.2 キャッシュ戦略

```typescript
class CacheStrategy {
  private readonly cacheConfig = {
    jwks: 24 * 60 * 60 * 1000, // JWKSキャッシュ: 24時間
    tokenValidation: 5 * 60 * 1000, // トークン検証結果: 5分
    userInfo: 15 * 60 * 1000, // ユーザー情報: 15分
    clientInfo: 60 * 60 * 1000, // クライアント情報: 1時間
  };

  async getWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    // Redisからキャッシュ取得
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Auth0障害時のフォールバック
    try {
      const data = await fetcher();
      await redis.setex(key, ttl / 1000, JSON.stringify(data));
      return data;
    } catch (error) {
      // スタンバイキャッシュから取得
      const standbyCache = await this.getStandbyCache(key);
      if (standbyCache) {
        return standbyCache;
      }
      throw error;
    }
  }

  private async getStandbyCache<T>(key: string): Promise<T | null> {
    // 期限切れでも最後の有効なキャッシュを返す
    const expired = await redis.get(`standby:${key}`);
    return expired ? JSON.parse(expired) : null;
  }
}
```

## 14. モニタリングと監視

### 14.1 メトリクス仕様

| メトリクス | 型 | 説明 |
|------------|-----|------|
| oauth_token_requests_total | Counter | トークンリクエスト総数 |
| oauth_authorization_requests_total | Counter | 認可リクエスト総数 |
| auth0_proxy_latency_seconds | Histogram | Auth0プロキシレイテンシ |
| oauth_cache_hit_rate | Gauge | キャッシュヒット率 |

### 14.2 監査ログ仕様

| フィールド | 説明 |
|----------|------|
| timestamp | イベント発生時刻 |
| eventType | token_issued, token_revoked, client_registered |
| clientId | クライアントID |
| userId | ユーザーID（オプション） |
| scope | 許可スコープ |
| ipAddress | クライアントIP |
| userAgent | User-Agentヘッダー |
| success | 成功/失敗 |
| errorCode | エラーコード（失敗時） |

### 14.3 異常検知基準

- 同一IPからの5分間で10回以上の失敗
- 1時間で20個以上のクライアント登録
- 未定義スコープの要求
- 不正なgrant_typeの使用

### 14.4 ヘルスチェック仕様

| サービス | チェック項目 | 闾値 |
|----------|------------|------|
| Database | 接続状態 | タイムアウト3秒 |
| Auth0 | API応答 | タイムアウト5秒 |
| Cache | Redis接続 | タイムアウト1秒 |
| Proxy | インスタンス状態 | アクティブ数確認 |

## 15. テスト戦略

### 15.1 テストカバレッジ

| テスト種別 | カバレッジ目標 | 主要テスト項目 |
|----------|-------------|-------------|
| 単体テスト | 80%以上 | トークン検証、スコープチェック、リソース検証 |
| 統合テスト | 70%以上 | OAuthフロー、Auth0プロキシ、DCR |
| E2Eテスト | 主要フロー | Authorization Code Flow、Client Credentials Flow |

### 15.2 セキュリティテスト

- SQLインジェクション対策
- XSS攻撃対策  
- CSRF攻撃対策
- トークンリプレイ攻撃対策
- Rate Limiting検証
- 権限昇格攻撃対策

## 16. 移行計画

### 16.1 既存システムからの移行

1. **APIキー認証の完全互換性**: 既存のAPIキーはそのまま動作
2. **段階的OAuth追加**:
   - フェーズ1: authType=API_KEYのまま維持
   - フェーズ2: authType=OAUTHを新規作成時に選択可能に
   - フェーズ3: 遅延バインディングによる自動ユーザー関連付け
3. **ロールバック計画**: authTypeをAPI_KEYに変更するだけで元に戻せる
4. **使い分けガイドライン**:
   - CI/CD、バックエンド: APIキー推奨
   - フロントエンド、MCP Inspector: OAuth推奨

### 16.2 遅延バインディングの運用

1. **仮登録クライアントの管理**
   - 管理画面で仮登録状態のクライアント一覧表示
   - 手動バインディング機能の提供（必要に応じて）
   
2. **自動クリーンアップ**
   - 30日間バインドされないクライアントの自動削除
   - 削除前の通知機能（オプション）
   
3. **監査とログ**
   - バインディングイベントの記録
   - 仮登録からバインディングまでの時間計測

## 17. 運用・監視

### 17.1 メトリクス

```typescript
const metrics = {
  // プロキシ層メトリクス
  "proxy.client.created": 0, // 新規クライアント作成数
  "proxy.client.pending": 0, // 仮登録状態のクライアント数
  "proxy.client.bound": 0, // バインド済みクライアント数
  "proxy.binding.success": 0, // バインディング成功数
  "proxy.binding.failure": 0, // バインディング失敗数
  "proxy.auth0.requests": 0, // Auth0へのリクエスト数
  "proxy.token.generated": 0, // Tumikiトークン生成数
  "proxy.mapping.success": 0, // マッピング成功数
  "proxy.mapping.failure": 0, // マッピング失敗数

  // 既存メトリクス
  "oauth.registration.success": 0,
  "oauth.registration.failure": 0,
  "oauth.token.issued": 0,
  "oauth.token.refreshed": 0,
  "oauth.token.revoked": 0,
  "oauth.auth.success": 0,
  "oauth.auth.failure": 0,
  "api.request.count": 0,
  "api.request.duration": [],
};
```

### 17.2 アラート設定

| メトリクス       | 閾値      | アクション       |
| ---------------- | --------- | ---------------- |
| エラー率         | > 5%      | PagerDuty通知    |
| レスポンス時間   | > 1秒     | Slack通知        |
| トークン発行失敗 | > 10回/分 | 調査開始         |
| Auth0 API制限    | > 80%     | 緊急対応         |
| クライアント作成 | > 100/日  | キャパシティ確認 |
| 仮登録クライアント | > 1000 | 自動削除ジョブ確認 |
| バインディング失敗 | > 5回/時 | 監査ログ確認 |

### 17.3 ログ分析

```typescript
// Elasticsearch/Kibanaでの分析例
{
  "query": {
    "bool": {
      "must": [
        { "term": { "event_type": "access_denied" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_client": {
      "terms": { "field": "client_id" }
    }
  }
}
```

## 17. 参考資料

### 17.1 仕様書

- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7591 - Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 8707 - Resource Indicators](https://datatracker.ietf.org/doc/html/rfc8707)
- [RFC 9126 - OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)

### 17.2 実装例

- [Auth0 Documentation](https://auth0.com/docs)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Spring Security OAuth](https://spring.io/projects/spring-security-oauth)

## 付録A: クライアント実装例

### A.1 MCP Inspector設定

```json
{
  "mcpServers": {
    "tumiki-server": {
      "url": "https://server.tumiki.cloud/mcp/cmcy0egw80005o0215bs2g7rr",
      "transport": {
        "type": "http",
        "oauth": {
          "type": "oauth2",
          "discovery_url": "https://server.tumiki.cloud/.well-known/oauth-protected-resource",
          "registration": {
            "endpoint": "https://auth.tumiki.cloud/oauth/register",
            "client_name": "MCP Inspector",
            "scope": "mcp:read mcp:write"
          },
          "authorization": {
            "endpoint": "https://auth.tumiki.cloud/oauth/authorize",
            "response_type": "code",
            "pkce": true
          },
          "token": {
            "endpoint": "https://auth.tumiki.cloud/oauth/token"
          }
        }
      }
    }
  }
}
```

### A.2 Node.js クライアント実装

```typescript
import { MCPClient } from "@modelcontextprotocol/client";
import { OAuthTransport } from "./oauth-transport";

class TumikiMCPClient {
  private client: MCPClient;
  private transport: OAuthTransport;

  async connect(instanceId: string) {
    // 1. Discovery
    const metadata = await this.discover(instanceId);

    // 2. Client Registration (初回のみ)
    const client = await this.registerClient(metadata.registration_endpoint);

    // 3. OAuth認証
    const token = await this.authenticate(client, instanceId);

    // 4. MCP接続
    this.transport = new OAuthTransport({
      url: `https://server.tumiki.cloud/mcp/${instanceId}`,
      token: token.access_token,
      refreshToken: token.refresh_token,
    });

    this.client = new MCPClient(this.transport);
    await this.client.connect();
  }

  private async discover(instanceId: string): Promise<Metadata> {
    const response = await fetch(
      "https://server.tumiki.cloud/.well-known/oauth-protected-resource",
    );
    return response.json();
  }

  private async registerClient(endpoint: string): Promise<ClientCredentials> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "My MCP Client",
        redirect_uris: ["http://localhost:3000/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: "mcp:read mcp:write",
      }),
    });

    return response.json();
  }

  private async authenticate(
    client: ClientCredentials,
    instanceId: string,
  ): Promise<TokenResponse> {
    // PKCE準備
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // ブラウザで認可
    const code = await this.authorizeInBrowser({
      client_id: client.client_id,
      redirect_uri: "http://localhost:3000/callback",
      code_challenge: codeChallenge,
      resource: `https://server.tumiki.cloud/mcp/${instanceId}`,
    });

    // トークン交換
    const response = await fetch("https://auth.tumiki.cloud/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: "http://localhost:3000/callback",
        code_verifier: codeVerifier,
        resource: `https://server.tumiki.cloud/mcp/${instanceId}`,
      }),
    });

    return response.json();
  }
}
```

## 付録B: トラブルシューティング

### B.1 よくあるエラーと対処法

| エラー               | 原因                     | 対処法                 |
| -------------------- | ------------------------ | ---------------------- |
| `invalid_resource`   | リソースパラメータが不正 | 正しい形式のURIを指定  |
| `invalid_client`     | クライアント認証失敗     | client_id/secretを確認 |
| `invalid_grant`      | 認可コードが無効         | コードの有効期限確認   |
| `insufficient_scope` | スコープ不足             | 必要なスコープを要求   |

### B.2 デバッグ方法

```bash
# トークンの内容確認
echo $ACCESS_TOKEN | cut -d. -f2 | base64 -d | jq

# Discovery確認
curl https://server.tumiki.cloud/.well-known/oauth-protected-resource | jq

# トークン検証
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     https://server.tumiki.cloud/mcp/test123 -v
```

---

**ドキュメントバージョン**: 2.1.0  
**最終更新日**: 2025年1月  
**作成者**: Tumiki Development Team  
**更新内容**:

- v2.0.0: OAuthプロキシアーキテクチャを追加し、Auth0の10クライアント制限を回避する設計に更新
- v2.1.0: 遅延バインディング方式によるDCRユーザーID管理の解決策を追加

**レビュー承認者**: [承認者名]
