# MCP仕様準拠OAuth認証システム実装計画

## 概要

このドキュメントは、[MCP仕様準拠認証システム設計書](./mcp-compliant-auth-design.md)に基づいて、Tumikiプロジェクトに実際に実装するための具体的な計画をまとめたものです。

## 現状分析

### 既存実装の確認

1. **データベース構造**
   - `UserMcpServerInstance.authType`フィールドが既に存在（API_KEY, OAUTH, BOTH, NONE）
   - `McpApiKey`テーブルが実装済み（APIキー認証用）
   - OAuthクライアント関連のテーブル（OAuthClient, OAuthToken等）は未実装

## DCRでのユーザーID管理の解決策

Dynamic Client Registration (DCR)では、クライアント登録時にユーザーが未認証の状態です。これに対する解決策：

### 推奨アプローチ: 遅延バインディング方式

1. **初期登録時**
   - システムユーザーID（`system_dcr_pending`）で仮登録
   - metadataフィールドに`isPending: true`フラグを設定

2. **初回認証時（Authorization Code Flow）**
   - Auth0から実際のユーザーIDを取得
   - 仮登録クライアントを実際のユーザーにバインド
   - MCPサーバーインスタンスとの関連付け

3. **メリット**
   - MCP仕様に完全準拠
   - MCP Inspectorとの互換性維持
   - セキュリティを損なわない

4. **実装詳細**
   - システムユーザーの事前作成が必要
   - バインディング処理をトークン交換時に実行
   - 一定期間バインドされないクライアントの自動削除機能

2. **認証ミドルウェア**
   - `integratedAuthMiddleware`が部分実装済み
   - API_KEY認証は完全動作
   - OAUTH認証は基本的なJWT検証のみ実装
   - BOTH認証は未実装（501エラーを返す）

3. **OAuth Discovery**
   - `/oauth/discovery`エンドポイントが存在するが、Auth0直接参照のみ
   - Dynamic Client Registrationは未実装

## フェーズ別実装計画

### フェーズ1: データベース準備（3日間）

#### 1.1 Prismaスキーマの作成

**新規ファイル作成**: `packages/db/prisma/schema/oauth.prisma`

```prisma
// OAuthクライアント情報（OAuth認証用）
model OAuthClient {
  id                    String   @id @default(cuid())
  clientId              String   @unique
  clientSecret          String   /// @encrypted  // prisma-field-encryptionで暗号化
  clientSecretHash      String?  @unique /// @encryption:hash(clientSecret)  // 自動生成されるハッシュ
  clientName            String
  clientUri             String?
  redirectUris          String[]
  grantTypes            String[]
  responseTypes         String[]
  scope                 String
  tokenEndpointAuthMethod String
  
  // MCPサーバーインスタンスとの関連
  userMcpServerInstanceId String?
  userMcpServerInstance UserMcpServerInstance? @relation(fields: [userMcpServerInstanceId], references: [id])
  
  // ユーザー情報
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  organizationId        String?
  organization          Organization? @relation(fields: [organizationId], references: [id])
  
  // メタデータ
  metadata              Json?
  
  // 管理情報
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  lastUsedAt            DateTime?
  expiresAt             DateTime?
  
  // リレーション
  authorizationCodes    OAuthAuthorizationCode[]
  tokens                OAuthToken[]
  
  @@index([userId])
  @@index([userMcpServerInstanceId])
  @@index([organizationId])
}

// OAuth認可コード
model OAuthAuthorizationCode {
  id                    String   @id @default(cuid())
  code                  String   @unique
  clientId              String
  userId                String
  redirectUri           String
  scope                 String
  state                 String?
  nonce                 String?
  codeChallenge         String?
  codeChallengeMethod   String?
  
  // Auth0マッピング
  auth0Code             String?
  
  // 有効期限
  expiresAt             DateTime
  usedAt                DateTime?
  
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
  tokenType             String   // "access" | "refresh"
  token                 String   @unique
  clientId              String
  userId                String?
  scope                 String
  resource              String[]
  
  // Auth0マッピング
  auth0AccessToken      String? @db.Text /// @encrypted
  auth0RefreshToken     String? @db.Text /// @encrypted
  
  // 有効期限
  expiresAt             DateTime
  
  // 管理情報
  createdAt             DateTime @default(now())
  lastUsedAt            DateTime?
  revokedAt             DateTime?
  
  // リレーション
  client                OAuthClient @relation(fields: [clientId], references: [id])
  
  @@index([clientId])
  @@index([userId])
  @@index([expiresAt])
  @@index([tokenType])
}
```

#### 1.2 既存スキーマの更新

**更新対象**: `packages/db/prisma/schema/userMcpServer.prisma`

```prisma
model UserMcpServerInstance {
  // ... 既存フィールド ...
  
  // OAuth関連の追加
  oauthClients          OAuthClient[]
  
  // ... 既存フィールド ...
}
```

**更新対象**: `packages/db/prisma/schema/auth.prisma`

```prisma
model User {
  // ... 既存フィールド ...
  
  // OAuth関連の追加
  oauthClients          OAuthClient[]
  
  // ... 既存フィールド ...
}
```

#### 1.3 マイグレーション実行

```bash
cd packages/db
pnpm prisma migrate dev --name add_oauth_tables
pnpm prisma generate
pnpm build
```

### フェーズ2: OAuthプロキシ層実装（5日間）

#### 2.1 Dynamic Client Registration

**重要な設計決定**: DCRでのユーザーID管理

MCP仕様準拠のDynamic Client Registrationでは、登録時点でユーザーが特定されていない場合があります。以下の3つのアプローチから選択します：

**アプローチ1: 初回認証時の遅延バインディング（推奨）**

- DCR時は仮のユーザーIDで登録
- 初回のAuthorization Code Flow完了時に実際のユーザーIDにバインド
- 最もMCP仕様に準拠した実装

**アプローチ2: 事前認証必須**

- DCRエンドポイントに認証を要求
- 登録時点でユーザーIDを確定
- セキュリティは高いが、MCP Inspectorとの互換性に課題

**アプローチ3: MCPサーバーインスタンスごとのクライアント**

- MCPサーバーインスタンスIDをパラメータで受け取る
- そのインスタンスのオーナーユーザーIDを使用
- URLパスにインスタンスIDを含める必要あり

**新規ファイル**: `apps/proxyServer/src/routes/oauth/register.ts`

```typescript
import { Router } from "express";
import { db } from "@tumiki/db/tcp";
import { randomBytes } from "crypto";

const router = Router();

// システムユーザーIDの定義（DCR用の特別なユーザー）
const SYSTEM_DCR_USER_ID = "system_dcr_pending";

// クライアント登録（アプローチ1: 遅延バインディング実装）
router.post("/oauth/register", async (req, res) => {
  const {
    client_name,
    client_uri,
    redirect_uris,
    grant_types,
    response_types,
    scope,
    token_endpoint_auth_method,
    // 拡張パラメータ（オプション）
    mcp_server_instance_id, // MCPサーバーインスタンスIDを指定可能
  } = req.body;

  // 入力検証
  if (!client_name || !redirect_uris || redirect_uris.length === 0) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing required parameters",
    });
  }

  // クライアントID/シークレット生成
  const clientId = `client_${randomBytes(12).toString("hex")}`;
  const clientSecret = `secret_${randomBytes(24).toString("hex")}`;
  // prisma-field-encryptionが自動的に暗号化とハッシュ化を処理

  try {
    // ユーザーIDの決定ロジック
    let userId = SYSTEM_DCR_USER_ID; // デフォルトは仮ID
    let userMcpServerInstanceId = null;

    // MCPサーバーインスタンスIDが指定されている場合
    if (mcp_server_instance_id) {
      const instance = await db.userMcpServerInstance.findUnique({
        where: { id: mcp_server_instance_id },
        select: { userId: true },
      });
      
      if (instance) {
        userId = instance.userId;
        userMcpServerInstanceId = mcp_server_instance_id;
      }
    }

    // 認証済みリクエストの場合（Bearer tokenがある場合）
    if (req.headers.authorization?.startsWith("Bearer ")) {
      // JWTからユーザーIDを取得する処理
      const userIdFromToken = await extractUserIdFromToken(req.headers.authorization);
      if (userIdFromToken) {
        userId = userIdFromToken;
      }
    }

    // DBに保存（prisma-field-encryptionが自動的に暗号化とハッシュ化を処理）
    const client = await db.oAuthClient.create({
      data: {
        clientId,
        clientSecret, // 自動的に暗号化される
        // clientSecretHashは自動生成される
        clientName: client_name,
        clientUri: client_uri || null,
        redirectUris: redirect_uris,
        grantTypes: grant_types || ["authorization_code"],
        responseTypes: response_types || ["code"],
        scope: scope || "mcp:read mcp:write",
        tokenEndpointAuthMethod: token_endpoint_auth_method || "client_secret_post",
        userId, // 仮ID or 実際のユーザーID
        userMcpServerInstanceId,
        metadata: {
          isPending: userId === SYSTEM_DCR_USER_ID, // 仮登録フラグ
          registeredAt: new Date().toISOString(),
        },
      },
    });

    // レスポンス
    res.status(201).json({
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      client_name,
      redirect_uris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      scope: client.scope,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      registration_access_token: `reg_${randomBytes(32).toString("hex")}`,
      registration_client_uri: `${process.env.MCP_PROXY_URL}/oauth/register/${clientId}`,
    });
  } catch (error) {
    console.error("Client registration error:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Failed to register client",
    });
  }
});

export default router;
```

#### 2.2 ユーザーバインディング処理

**新規ファイル**: `apps/proxyServer/src/utils/clientBinding.ts`

```typescript
import { db } from "@tumiki/db/tcp";

/**
 * 仮登録クライアントを実際のユーザーにバインド
 * Authorization Code Flow完了時に呼び出される
 */
export async function bindClientToUser(
  clientId: string,
  userId: string,
  mcpServerInstanceId?: string
): Promise<void> {
  const client = await db.oAuthClient.findUnique({
    where: { clientId },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  // 仮登録クライアントの場合のみバインド
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
}

/**
 * システムユーザーの作成または取得
 */
export async function ensureSystemUser(): Promise<string> {
  const SYSTEM_DCR_USER_ID = "system_dcr_pending";
  
  // システムユーザーが存在するか確認
  const existingUser = await db.user.findUnique({
    where: { id: SYSTEM_DCR_USER_ID },
  });

  if (!existingUser) {
    // システムユーザーを作成
    await db.user.create({
      data: {
        id: SYSTEM_DCR_USER_ID,
        name: "System DCR User",
        email: "dcr@system.tumiki.cloud",
        role: "USER",
        hasCompletedOnboarding: true,
      },
    });
  }

  return SYSTEM_DCR_USER_ID;
}
```

#### 2.3 Authorization Endpoint

**新規ファイル**: `apps/proxyServer/src/routes/oauth/authorize.ts`

```typescript
import { Router } from "express";
import { db } from "@tumiki/db/tcp";
import { randomBytes } from "crypto";
import { authSessionStore } from "../../utils/authSession";

const router = Router();

router.get("/oauth/authorize", async (req, res) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    nonce,
    code_challenge,
    code_challenge_method,
    resource,
  } = req.query;

  // 1. パラメータ検証
  if (!client_id || !redirect_uri || !resource) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing required parameters",
    });
  }

  // 2. クライアント検証
  const client = await db.oAuthClient.findUnique({
    where: { clientId: client_id as string, isActive: true },
  });

  if (!client) {
    return res.status(400).json({
      error: "invalid_client",
      error_description: "Client not found",
    });
  }

  // 3. リダイレクトURI検証
  if (!client.redirectUris.includes(redirect_uri as string)) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Invalid redirect_uri",
    });
  }

  // 4. Auth0へのリダイレクト準備
  const auth0Params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.AUTH0_CLIENT_ID!,
    redirect_uri: `${process.env.MCP_PROXY_URL}/oauth/callback`,
    scope: scope as string || "openid profile email",
    state: `${client_id}:${state}:${randomBytes(16).toString("hex")}`,
    ...(nonce && { nonce: nonce as string }),
  });

  // 5. セッションに情報を保存
  const sessionId = randomBytes(32).toString("hex");
  authSessionStore.createSession(sessionId, {
    clientId: client_id as string,
    redirectUri: redirect_uri as string,
    codeChallenge: code_challenge as string,
    codeChallengeMethod: code_challenge_method as string,
    resource: resource as string,
    state: state as string,
    nonce: nonce as string,
  });

  // 6. Auth0へリダイレクト
  res.redirect(`https://${process.env.AUTH0_M2M_DOMAIN}/authorize?${auth0Params}`);
});

export default router;
```

#### 2.4 Token Endpoint（ユーザーバインディング対応）

**新規ファイル**: `apps/proxyServer/src/routes/oauth/token.ts`

```typescript
import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "@tumiki/db/tcp";
import { createHash } from "crypto";
import { bindClientToUser } from "../utils/clientBinding";

const router = Router();

router.post("/oauth/token", async (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri, code_verifier, resource } = req.body;

  // グラントタイプによる処理分岐
  switch (grant_type) {
    case "authorization_code":
      await handleAuthorizationCode(req, res);
      break;
    case "client_credentials":
      await handleClientCredentials(req, res);
      break;
    case "refresh_token":
      await handleRefreshToken(req, res);
      break;
    default:
      res.status(400).json({
        error: "unsupported_grant_type",
        error_description: "Grant type not supported",
      });
  }
});

async function handleAuthorizationCode(req: any, res: any) {
  const { code, client_id, client_secret, redirect_uri, code_verifier, resource } = req.body;

  // 1. クライアント認証（prisma-field-encryptionがハッシュ比較を自動処理）
  const client = await db.oAuthClient.findUnique({
    where: { 
      clientId: client_id,
      clientSecretHash: client_secret // prisma-field-encryptionが自動的にハッシュ化して比較
    },
  });

  if (!client) {
    return res.status(401).json({
      error: "invalid_client",
      error_description: "Client authentication failed",
    });
  }

  // 2. 認可コード検証
  const authCode = await db.oAuthAuthorizationCode.findUnique({
    where: { code, clientId: client.id },
  });

  if (!authCode || authCode.expiresAt < new Date() || authCode.usedAt) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Invalid or expired authorization code",
    });
  }

  // 3. PKCE検証
  if (authCode.codeChallenge) {
    const challenge = createHash("sha256").update(code_verifier).digest("base64url");
    if (challenge !== authCode.codeChallenge) {
      return res.status(400).json({
        error: "invalid_grant",
        error_description: "PKCE verification failed",
      });
    }
  }

  // 4. Auth0トークン交換（実際のユーザー認証）
  const auth0Response = await exchangeAuth0Code(authCode.auth0Code!, redirect_uri);
  
  if (!auth0Response.success) {
    return res.status(500).json({
      error: "server_error",
      error_description: "Failed to exchange Auth0 code",
    });
  }

  // 4.5. クライアントのユーザーバインディング（初回認証時）
  const metadata = client.metadata as any;
  if (metadata?.isPending) {
    // resourceパラメータからMCPサーバーインスタンスIDを抽出
    const instanceId = extractInstanceIdFromResource(resource);
    await bindClientToUser(client.clientId, auth0Response.userId, instanceId);
  }

  // 5. Tumikiトークン生成
  const accessToken = jwt.sign(
    {
      iss: `${process.env.MCP_PROXY_URL}`,
      sub: auth0Response.userId,
      aud: resource || `${process.env.MCP_PROXY_URL}/mcp`,
      client_id,
      scope: authCode.scope,
      exp: Math.floor(Date.now() / 1000) + 900, // 15分
    },
    process.env.JWT_PRIVATE_KEY!,
    { algorithm: "RS256" }
  );

  // 6. リフレッシュトークン生成
  const refreshToken = `refresh_${randomBytes(32).toString("hex")}`;

  // 7. トークンをDBに保存
  await db.oAuthToken.createMany({
    data: [
      {
        tokenType: "access",
        token: accessToken,
        clientId: client.id,
        userId: auth0Response.userId,
        scope: authCode.scope,
        resource: [resource],
        auth0AccessToken: auth0Response.accessToken,
        expiresAt: new Date(Date.now() + 900000),
      },
      {
        tokenType: "refresh",
        token: refreshToken,
        clientId: client.id,
        userId: auth0Response.userId,
        scope: authCode.scope,
        resource: [resource],
        auth0RefreshToken: auth0Response.refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日
      },
    ],
  });

  // 8. 認可コードを使用済みにする
  await db.oAuthAuthorizationCode.update({
    where: { id: authCode.id },
    data: { usedAt: new Date() },
  });

  // 9. レスポンス
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 900,
    refresh_token: refreshToken,
    scope: authCode.scope,
    resource,
  });
}

export default router;
```

#### 2.5 Wellknownエンドポイント

**新規ファイル**: `apps/proxyServer/src/routes/oauth/wellknown.ts`

```typescript
import { Router } from "express";

const router = Router();

// OAuth Protected Resource Metadata
router.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    resource: `${process.env.MCP_PROXY_URL}/mcp/{instance_id}`,
    authorization_servers: [`${process.env.MCP_PROXY_URL}`],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://docs.tumiki.cloud/mcp",
    resource_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["mcp:read", "mcp:write", "mcp:admin"],
  });
});

// OAuth Authorization Server Metadata
router.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json({
    issuer: process.env.MCP_PROXY_URL,
    authorization_endpoint: `${process.env.MCP_PROXY_URL}/oauth/authorize`,
    token_endpoint: `${process.env.MCP_PROXY_URL}/oauth/token`,
    registration_endpoint: `${process.env.MCP_PROXY_URL}/oauth/register`,
    jwks_uri: `${process.env.MCP_PROXY_URL}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "client_credentials", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
    code_challenge_methods_supported: ["S256"],
    resource_indicators_supported: true,
    revocation_endpoint: `${process.env.MCP_PROXY_URL}/oauth/revoke`,
    introspection_endpoint: `${process.env.MCP_PROXY_URL}/oauth/introspect`,
  });
});

// JWKS Endpoint
router.get("/.well-known/jwks.json", (req, res) => {
  // 公開鍵をJWKS形式で返す
  const publicKey = process.env.JWT_PUBLIC_KEY!;
  const jwk = {
    kty: "RSA",
    use: "sig",
    kid: "tumiki-001",
    alg: "RS256",
    n: "...", // 公開鍵のモジュラス
    e: "AQAB", // 公開指数
  };

  res.json({
    keys: [jwk],
  });
});

export default router;
```

### フェーズ3: 認証ミドルウェア統合（3日間）

#### 3.1 integratedAuthMiddleware の完全実装

**更新対象**: `apps/proxyServer/src/middleware/integratedAuth.ts`

```typescript
// BOTHタイプのサポートを追加
case "BOTH":
  // APIキーまたはOAuth認証のいずれかが有効
  let authenticated = false;
  let authError: string | null = null;

  // 1. APIキー認証を試行
  if (apiKey) {
    const apiKeyValidation = await validateApiKey(apiKey);
    if (apiKeyValidation.valid && 
        apiKeyValidation.userMcpServerInstance?.id === mcpServerInstanceId) {
      req.authInfo = {
        type: "api_key",
        userId: apiKeyValidation.apiKey?.userId,
        userMcpServerInstanceId: mcpServerInstance.id,
        organizationId: mcpServerInstance.organizationId ?? undefined,
      };
      authenticated = true;
    } else {
      authError = "Invalid API key";
    }
  }

  // 2. APIキー認証が失敗した場合、OAuth認証を試行
  if (!authenticated && hasBearerToken) {
    try {
      await new Promise<void>((resolve, reject) => {
        jwtCheck(req, res, (err?: unknown) => {
          if (err) {
            reject(err);
          } else {
            req.authInfo = {
              type: "oauth",
              userId: mcpServerInstance.userId,
              userMcpServerInstanceId: mcpServerInstance.id,
              organizationId: mcpServerInstance.organizationId ?? undefined,
              sub: (req as Request & { auth?: JWTAuth }).auth?.payload?.sub,
              scope: (req as Request & { auth?: JWTAuth }).auth?.payload?.scope,
              permissions: (req as Request & { auth?: JWTAuth }).auth?.payload?.permissions,
            };
            authenticated = true;
            resolve();
          }
        });
      });
    } catch (err) {
      authError = "Invalid OAuth token";
    }
  }

  // 3. どちらの認証も失敗した場合
  if (!authenticated) {
    sendAuthError(
      res,
      401,
      authError || "Either API key or OAuth authentication required",
      -32000,
      { "WWW-Authenticate": 'Bearer realm="MCP API"' }
    );
    return;
  }

  return next();
```

#### 3.2 トークン検証ユーティリティ

**新規ファイル**: `apps/proxyServer/src/utils/tokenValidation.ts`

```typescript
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { db } from "@tumiki/db/tcp";

const client = jwksClient({
  jwksUri: `${process.env.MCP_PROXY_URL}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000, // 24時間
});

export const validateTumikiToken = async (token: string): Promise<TokenValidationResult> => {
  try {
    // 1. JWT署名検証
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, getKey, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // 2. トークンがDBに存在し、有効か確認
    const dbToken = await db.oAuthToken.findUnique({
      where: { 
        token,
        tokenType: "access",
        revokedAt: null,
      },
    });

    if (!dbToken || dbToken.expiresAt < new Date()) {
      return { valid: false, error: "Token expired or revoked" };
    }

    // 3. リソース検証
    const requestedResource = decoded.aud;
    if (!dbToken.resource.includes(requestedResource)) {
      return { valid: false, error: "Invalid resource" };
    }

    return {
      valid: true,
      userId: decoded.sub,
      clientId: decoded.client_id,
      scope: decoded.scope,
      resource: dbToken.resource,
    };
  } catch (error) {
    return { valid: false, error: "Token validation failed" };
  }
};

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}
```

### フェーズ4: APIキー管理の拡張（2日間）

#### 4.1 APIキー生成の更新

**更新対象**: `apps/manager/src/server/api/routers/mcpApiKey/createApiKey.ts`

```typescript
// authTypeのチェックを追加
export const createApiKey = async (input: CreateApiKeyInput) => {
  const { userMcpServerInstanceId, name, expiresAt } = input;

  // MCPサーバーインスタンスの取得
  const instance = await db.userMcpServerInstance.findUnique({
    where: { id: userMcpServerInstanceId },
  });

  if (!instance) {
    throw new Error("MCP server instance not found");
  }

  // authTypeの確認
  if (instance.authType !== "API_KEY" && instance.authType !== "BOTH") {
    throw new Error("This server does not support API key authentication");
  }

  // 既存のAPIキー生成ロジック...
};
```

### フェーズ5: フロントエンド実装（3日間）

#### 5.1 OAuthクライアント管理画面

**新規ファイル**: `apps/manager/src/app/(main)/settings/oauth-clients/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OAuthClientsPage() {
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const { data: clients, refetch } = trpc.oauth.listClients.useQuery();

  const registerMutation = trpc.oauth.registerClient.useMutation({
    onSuccess: () => {
      refetch();
      setShowRegisterForm(false);
    },
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">OAuthクライアント管理</h1>
      
      <Button onClick={() => setShowRegisterForm(true)} className="mb-4">
        新規クライアント登録
      </Button>

      {showRegisterForm && (
        <Card className="p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">新規クライアント登録</h2>
          <OAuthClientRegistrationForm 
            onSubmit={(data) => registerMutation.mutate(data)}
            onCancel={() => setShowRegisterForm(false)}
          />
        </Card>
      )}

      <div className="grid gap-4">
        {clients?.map((client) => (
          <Card key={client.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{client.clientName}</h3>
                <p className="text-sm text-gray-600">Client ID: {client.clientId}</p>
                <p className="text-sm text-gray-600">作成日: {new Date(client.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">詳細</Button>
                <Button variant="destructive" size="sm">削除</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 5.2 認証方式選択UI

**更新対象**: `apps/manager/src/app/(main)/servers/[id]/settings/page.tsx`

```typescript
// 認証タイプ選択セクションを追加
<Card className="p-6">
  <h2 className="text-lg font-semibold mb-4">認証設定</h2>
  
  <RadioGroup value={authType} onValueChange={setAuthType}>
    <div className="flex items-center space-x-2 mb-3">
      <RadioGroupItem value="API_KEY" id="api-key" />
      <Label htmlFor="api-key">
        APIキー認証
        <span className="text-sm text-gray-600 block">
          CI/CDやバックエンドサービスに適しています
        </span>
      </Label>
    </div>
    
    <div className="flex items-center space-x-2 mb-3">
      <RadioGroupItem value="OAUTH" id="oauth" />
      <Label htmlFor="oauth">
        OAuth認証
        <span className="text-sm text-gray-600 block">
          Webアプリやモバイルアプリに適しています
        </span>
      </Label>
    </div>
    
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="BOTH" id="both" disabled />
      <Label htmlFor="both" className="opacity-50">
        両方許可（開発中）
        <span className="text-sm text-gray-600 block">
          APIキーとOAuth両方を許可します
        </span>
      </Label>
    </div>
  </RadioGroup>
  
  <Button 
    onClick={() => updateAuthType(authType)} 
    className="mt-4"
    disabled={isUpdating}
  >
    認証設定を更新
  </Button>
</Card>
```

### フェーズ6: テストとドキュメント（2日間）

#### 6.1 統合テスト

**新規ファイル**: `apps/proxyServer/src/__tests__/oauth.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../index";
import { db } from "@tumiki/db/tcp";

describe("OAuth認証フロー", () => {
  let clientId: string;
  let clientSecret: string;

  beforeAll(async () => {
    // テスト用クライアント登録
    const response = await request(app)
      .post("/oauth/register")
      .send({
        client_name: "Test Client",
        redirect_uris: ["http://localhost:3000/callback"],
        grant_types: ["authorization_code", "client_credentials"],
        scope: "mcp:read mcp:write",
      });

    clientId = response.body.client_id;
    clientSecret = response.body.client_secret;
  });

  afterAll(async () => {
    // クリーンアップ
    await db.oAuthClient.deleteMany({
      where: { clientId },
    });
  });

  test("Dynamic Client Registration", async () => {
    const response = await request(app)
      .post("/oauth/register")
      .send({
        client_name: "Test Client 2",
        redirect_uris: ["http://localhost:3000/callback"],
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("client_id");
    expect(response.body).toHaveProperty("client_secret");
  });

  test("Client Credentials Flow", async () => {
    const response = await request(app)
      .post("/oauth/token")
      .send({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "mcp:read",
        resource: "https://server.tumiki.cloud/mcp/test123",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("access_token");
    expect(response.body.token_type).toBe("Bearer");
    expect(response.body.expires_in).toBe(900);
  });

  test("Well-known Discovery", async () => {
    const response = await request(app)
      .get("/.well-known/oauth-authorization-server");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("issuer");
    expect(response.body).toHaveProperty("authorization_endpoint");
    expect(response.body).toHaveProperty("token_endpoint");
  });
});
```

#### 6.2 ドキュメント作成

**新規ファイル**: `docs/auth/oauth-integration-guide.md`

```markdown
# OAuth統合ガイド

## MCP InspectorでのOAuth設定

### 1. クライアント登録

MCP Inspectorを初めて使用する場合、自動的にクライアント登録が行われます。

```json
{
  "mcpServers": {
    "tumiki-server": {
      "url": "https://server.tumiki.cloud/mcp/{instance_id}",
      "transport": {
        "type": "http",
        "oauth": {
          "type": "oauth2",
          "discovery_url": "https://server.tumiki.cloud/.well-known/oauth-protected-resource"
        }
      }
    }
  }
}
```

### 2. 認証フロー

1. MCP Inspectorが自動的にDiscoveryエンドポイントを呼び出し
2. Dynamic Client Registrationでクライアントを登録
3. Authorization Code Flow + PKCEで認証
4. アクセストークンを取得してMCPサーバーにアクセス

## APIキー認証からの移行

既存のAPIキー認証を使用している場合、以下の手順で移行できます：

1. MCPサーバーインスタンスの設定画面を開く
2. 認証タイプを「BOTH」に変更（実装完了後）
3. 段階的にOAuth認証に移行
4. 完全移行後、認証タイプを「OAUTH」に変更

## トラブルシューティング

### よくある問題

1. **"Invalid redirect_uri"エラー**
   - 登録時に指定したリダイレクトURIと完全一致する必要があります
   - 開発環境では`http://localhost`が許可されています

2. **"PKCE verification failed"エラー**
   - code_challengeメソッドはS256のみサポート
   - plainメソッドはセキュリティ上サポートしていません

3. **トークン有効期限**
   - アクセストークン: 15分
   - リフレッシュトークン: 30日
   - 期限切れの場合は自動的にリフレッシュされます
```

### フェーズ7: セキュリティ強化（2日間）

#### 7.1 Rate Limiting実装

**新規ファイル**: `apps/proxyServer/src/middleware/rateLimiting.ts`

```typescript
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

// OAuth登録用レート制限
export const registrationLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:register:",
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回
  message: "Too many registration requests",
});

// トークンエンドポイント用レート制限
export const tokenLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:token:",
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: 20, // 最大20回
  message: "Too many token requests",
});

// API呼び出し用レート制限
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:api:",
  }),
  windowMs: 60 * 1000, // 1分
  max: 100, // 最大100回
  message: "Too many API requests",
});
```

#### 7.2 監査ログ実装

**新規ファイル**: `packages/db/prisma/schema/audit.prisma`

```prisma
model OAuthAuditLog {
  id          String   @id @default(cuid())
  eventType   String   // token_issued, token_revoked, client_registered
  clientId    String?
  userId      String?
  scope       String?
  ipAddress   String
  userAgent   String?
  success     Boolean
  errorCode   String?
  metadata    Json?
  
  createdAt   DateTime @default(now())
  
  @@index([eventType])
  @@index([clientId])
  @@index([userId])
  @@index([createdAt])
}
```

### デプロイメント計画

#### 環境変数の追加

```env
# JWT署名用キーペア
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=

# Auth0プロキシ設定
AUTH0_SHARED_CLIENT_ID=
AUTH0_SHARED_CLIENT_SECRET=

# Redis（Rate Limiting用）
REDIS_URL=redis://localhost:6379

# セキュリティ設定
PKCE_REQUIRED=true
TOKEN_LIFETIME_ACCESS=900
TOKEN_LIFETIME_REFRESH=2592000
```

#### デプロイ手順

1. **データベースマイグレーション**

   ```bash
   cd packages/db
   pnpm prisma migrate deploy
   ```

2. **ProxyServerデプロイ**

   ```bash
   cd apps/proxyServer
   pnpm build
   pm2 restart proxy-server
   ```

3. **Managerアプリデプロイ**

   ```bash
   cd apps/manager
   pnpm build
   vercel --prod
   ```

## リスク管理

### 技術的リスク

1. **Auth0 API制限**
   - 緩和策: トークンキャッシュ、バッチ処理
   
2. **トークン漏洩**
   - 緩和策: 短期間トークン、暗号化保存、監査ログ

3. **下位互換性**
   - 緩和策: APIキー認証の維持、段階的移行

### ロールバック計画

1. authTypeをAPI_KEYに戻す
2. OAuthテーブルはそのまま保持（データ保全）
3. OAuthエンドポイントを無効化

## 成功指標

- [ ] MCP InspectorでのOAuth認証成功率 > 99%
- [ ] トークン発行レイテンシ < 200ms
- [ ] APIキーからの移行完了率 > 80%（6ヶ月後）
- [ ] セキュリティインシデント 0件

## タイムライン

| フェーズ | 期間 | 開始日 | 完了予定日 |
|---------|------|--------|-----------|
| フェーズ1: DB準備 | 3日 | 2025/01/11 | 2025/01/13 |
| フェーズ2: OAuthプロキシ | 5日 | 2025/01/14 | 2025/01/18 |
| フェーズ3: 認証統合 | 3日 | 2025/01/19 | 2025/01/21 |
| フェーズ4: APIキー拡張 | 2日 | 2025/01/22 | 2025/01/23 |
| フェーズ5: フロントエンド | 3日 | 2025/01/24 | 2025/01/26 |
| フェーズ6: テスト | 2日 | 2025/01/27 | 2025/01/28 |
| フェーズ7: セキュリティ | 2日 | 2025/01/29 | 2025/01/30 |

**総期間**: 20日間（約4週間）

## まとめ

### DCRユーザーID問題の解決

OAuthClientテーブルのuserIdが必須という制約に対して、**遅延バインディング方式**を採用することで解決します：

1. **仮登録フェーズ**
   - DCR時はシステムユーザーID（`system_dcr_pending`）で登録
   - クライアントは使用可能だが、仮状態として管理

2. **バインディングフェーズ**
   - 初回のAuthorization Code Flow完了時
   - Auth0認証後、実際のユーザーIDを取得
   - クライアントを実ユーザーにバインド

3. **運用上の考慮事項**
   - 30日間バインドされないクライアントは自動削除
   - 管理画面で仮登録クライアントの確認が可能
   - 監査ログでバインディング履歴を記録

この方式により、MCP仕様準拠を維持しながら、データベース制約も満たすことができます。

## 次のステップ

1. このドキュメントのレビューと承認
2. システムユーザーの作成スクリプト準備
3. フェーズ1の実装開始