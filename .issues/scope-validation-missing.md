---
apps:
  - mcp-proxy
severity: medium
difficulty: high
---

# スコープ検証の未実装

## 概要

JWTトークンに含まれるスコープ（scope）の検証が実装されておらず、細粒度のアクセス制御ができない。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/middleware/auth/jwt.ts`
- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/libs/auth/jwt-verifier.ts`

## 詳細

### 現状

`jwt-verifier.ts` でJWTの検証を行っているが、スコープの検証はない:

```typescript
export const verifyKeycloakJWT = async (
  accessToken: string,
): Promise<JWTPayload> => {
  const metadata = await getKeycloakServerMetadata();
  const jwks = await getJWKS();

  const { payload } = await jwtVerify(accessToken, jwks, {
    issuer: metadata.issuer,
    clockTolerance: 60,
  });

  return payload as JWTPayload;
  // スコープの検証なし
};
```

`jwt.ts` および `index.ts` の認証ミドルウェアでも、スコープに基づくアクセス制御はない:

```typescript
// JWT ペイロードをコンテキストに設定
c.set("jwtPayload", jwtPayload);

// スコープの検証なし - すべての認証済みユーザーが同じ権限を持つ
```

### 問題点

1. **細粒度アクセス制御の欠如**
   - 読み取り専用アクセスと書き込みアクセスの区別なし
   - ツール実行の種類による制限なし
   - 機密データへのアクセス制限なし

2. **OAuth 2.0 のベストプラクティス未準拠**
   - OAuth 2.0 では scope パラメータによるアクセス制御が推奨
   - Keycloak はスコープベースの認可をサポートしている

3. **最小権限の原則違反**
   - 認証されたユーザーは全ての操作が可能
   - APIキーも全ての操作に使用可能

4. **監査要件への不適合**
   - 細粒度のアクセスログが取れない
   - 誰がどの権限で何をしたかの追跡が困難

### 影響

- **セキュリティ**: 過剰な権限によるリスク
- **コンプライアンス**: 監査要件への不適合
- **運用**: 権限管理の柔軟性欠如

## 推奨される対策

1. **スコープ定義**

```typescript
// constants/scopes.ts
export const SCOPES = {
  // MCPサーバー操作
  MCP_READ: "mcp:read",
  MCP_WRITE: "mcp:write",
  MCP_EXECUTE: "mcp:execute",

  // ツール操作
  TOOLS_READ: "tools:read",
  TOOLS_EXECUTE: "tools:execute",

  // 管理操作
  ADMIN_READ: "admin:read",
  ADMIN_WRITE: "admin:write",

  // 統合MCPサーバー
  UNIFIED_READ: "unified:read",
  UNIFIED_WRITE: "unified:write",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

// エンドポイントごとの必要スコープ
export const ENDPOINT_SCOPES: Record<string, Scope[]> = {
  "GET /mcp/:serverId": [SCOPES.MCP_READ],
  "POST /mcp/:serverId": [SCOPES.MCP_EXECUTE],
  "GET /unified": [SCOPES.UNIFIED_READ],
  "POST /unified": [SCOPES.UNIFIED_WRITE],
};
```

2. **スコープ検証ミドルウェア**

```typescript
// middleware/scopeValidator.ts
import { SCOPES, type Scope } from "../constants/scopes.js";

export const requireScopes = (...requiredScopes: Scope[]) => {
  return async (c: Context, next: Next) => {
    const jwtPayload = c.get("jwtPayload");

    if (!jwtPayload) {
      return c.json(createUnauthorizedError("Authentication required"), 401);
    }

    // JWTのscope claimを取得
    const tokenScopes = parseScopes(jwtPayload.scope);

    // 必要なスコープをすべて持っているか確認
    const missingScopes = requiredScopes.filter(
      (scope) => !tokenScopes.includes(scope),
    );

    if (missingScopes.length > 0) {
      logWarning("Insufficient scopes", {
        required: requiredScopes,
        provided: tokenScopes,
        missing: missingScopes,
      });

      return c.json(
        createPermissionDeniedError("Insufficient permissions", {
          requiredScopes: requiredScopes,
          missingScopes: missingScopes,
        }),
        403,
      );
    }

    await next();
  };
};

const parseScopes = (scopeString: string | undefined): Scope[] => {
  if (!scopeString) return [];
  return scopeString
    .split(" ")
    .filter((s): s is Scope => Object.values(SCOPES).includes(s as Scope));
};
```

3. **ルートへの適用**

```typescript
// routes/mcp.ts
import { requireScopes } from "../middleware/scopeValidator.js";
import { SCOPES } from "../constants/scopes.js";

export const mcpRoute = new Hono<HonoEnv>();

// 読み取り操作
mcpRoute.get(
  "/:serverId/tools",
  authMiddleware,
  requireScopes(SCOPES.MCP_READ, SCOPES.TOOLS_READ),
  listToolsHandler,
);

// ツール実行
mcpRoute.post(
  "/:serverId/tools/:toolName",
  authMiddleware,
  requireScopes(SCOPES.MCP_EXECUTE, SCOPES.TOOLS_EXECUTE),
  executeToolHandler,
);
```

4. **Keycloak でのスコープ設定**

```
Keycloak Admin Console:
1. Clients → tumiki-mcp-proxy
2. Client Scopes タブ
3. 新しいスコープを作成:
   - mcp:read
   - mcp:write
   - mcp:execute
   - tools:read
   - tools:execute
4. 各スコープをClientにマッピング
```

5. **APIキーのスコープサポート**

```typescript
// Prisma schema
model McpApiKey {
  // 既存フィールド
  scopes String[] @default([])
}

// apiKey.ts
const mcpApiKey = await fetchApiKeyFromDatabase(apiKey);

// APIキーのスコープを検証
const apiKeyScopes = mcpApiKey.scopes;
c.set("tokenScopes", apiKeyScopes);
```

6. **スコープ監査ログ**

```typescript
// 各操作でスコープを記録
logInfo("Operation performed", {
  userId: authContext.userId,
  operation: "tools:execute",
  requiredScopes: [SCOPES.MCP_EXECUTE, SCOPES.TOOLS_EXECUTE],
  providedScopes: tokenScopes,
  mcpServerId: serverId,
  toolName: toolName,
});
```

7. **JWTペイロード型の更新**

```typescript
// types/index.ts
export type JWTPayload = {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  scope?: string; // スコープを追加
  // Keycloak固有
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
};
```

## 関連ファイル

- `apps/mcp-proxy/src/middleware/auth/jwt.ts`
- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/libs/auth/jwt-verifier.ts`
- `apps/mcp-proxy/src/types/index.ts`
- `packages/db/prisma/schema/apiKey.prisma`
