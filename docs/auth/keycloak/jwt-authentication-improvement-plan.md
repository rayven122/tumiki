# Keycloak JWT認証 設計改善実装計画

## 📋 概要

### 目的

Keycloak JWT認証を本番運用可能な品質に改善し、以下の課題を解決する：

1. **ハードコード値の削除**: `"jwt-instance"`, `"jwt-api-key"` などの固定値を実際のデータに置き換え
2. **適切な権限管理の実装**: スコープとロールベースのアクセス制御
3. **JWT → UserMcpServerInstance マッピング**: JWTペイロードから実際のインスタンスを解決
4. **セキュリティ強化**: 本番環境での認証バイパスリスクの排除

### 設計方針: ハイブリッドアーキテクチャ

Keycloak JWT認証では、**ハイブリッドアーキテクチャ**を採用します。

```
┌─────────────────────────────────────────────────────────────┐
│ Keycloak                                                     │
│  - 認証（Authentication）                                     │
│  - 粗粒度な組織・ロール管理                                   │
│  - JWTトークン発行                                            │
│  ⚠️ JWTサイズ制限: ~500バイト（Cookie 4KB制限考慮）           │
└─────────────────────────────────────────────────────────────┘
                          ↓ JWT
┌─────────────────────────────────────────────────────────────┐
│ Proxy Server (JWT検証)                                       │
│  - JWT署名検証                                                │
│  - 基本的な認可（組織・ロールチェック）                        │
└─────────────────────────────────────────────────────────────┘
                          ↓ AuthInfo
┌─────────────────────────────────────────────────────────────┐
│ Database (詳細権限管理)                                       │
│  - ツールグループレベルの権限                                  │
│  - 個別ツールの有効/無効設定                                   │
│  - リソースレベルのアクセス制御                                │
│  ⚡ Redisキャッシュ（TTL: 5分）                               │
└─────────────────────────────────────────────────────────────┘
```

**ハイブリッド設計を選択した理由**:

1. **JWTサイズ問題の解決**: ツール単位のスコープをJWTに含めると15,000バイト以上になり、Cookie制限（4KB）を大幅に超過
2. **リアルタイム権限変更**: DB管理により、トークン再発行なしで権限変更を即座に反映
3. **既存モデルの活用**: `OrganizationRole`, `RolePermission`, `ResourceAccessControl` など詳細な権限管理モデルが既に実装済み
4. **パフォーマンス**: Redisキャッシュで頻繁なDB問い合わせを回避

---

## 🎯 実装項目

### 1. JWT構造の設計とKeycloak設定

#### 1.1 目標JWT構造

```json
{
  "sub": "user_keycloak_id",
  "email": "user@example.com",
  "name": "User Name",
  "preferred_username": "username",

  // 標準のロール（Keycloak Realm Roles）
  "realm_access": {
    "roles": ["admin", "user", "viewer"]
  },

  // Tumiki専用カスタムクレーム
  "tumiki": {
    "org_id": "org_cuid123",           // Organization.id
    "is_org_admin": true,               // OrganizationMember.isAdmin
    "user_db_id": "user_db_cuid456"    // User.id（DB主キー）
  }
}
```

**想定サイズ**: 約300-400バイト（Base64エンコード後も1KB以下）

#### 1.2 Keycloak Protocol Mapperの設定

Keycloakの **Protocol Mapper** 機能を使用して、カスタムクレーム `tumiki` をJWTに自動追加します。

**設定手順**:

1. Keycloak Admin Consoleにログイン
2. Realm: `tumiki` を選択
3. Client Scopes → Create
4. Client Scope名: `tumiki-claims`
5. Mappers → Add mapper → By configuration → User Attribute

**Mapper設定例**:

| Mapper名 | Mapper Type | User Attribute | Token Claim Name | Claim JSON Type |
|---------|-------------|----------------|------------------|-----------------|
| org_id | User Attribute | tumiki_org_id | tumiki.org_id | String |
| is_org_admin | User Attribute | tumiki_is_org_admin | tumiki.is_org_admin | boolean |
| user_db_id | User Attribute | tumiki_user_db_id | tumiki.user_db_id | String |

**初期化スクリプトへの統合**:

`docker/keycloak/init-scripts/setup-tumiki.sh` に以下を追加:

```bash
#!/bin/bash

# ... 既存の設定 ...

# Tumikiカスタムクレーム用のClient Scopeを作成
CLIENT_SCOPE_ID=$(kcadm.sh create client-scopes \
  -r tumiki \
  -s name=tumiki-claims \
  -s description="Tumiki custom claims for JWT" \
  -s protocol=openid-connect \
  -i)

# Protocol Mapper: org_id
kcadm.sh create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r tumiki \
  -s name=org_id \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_org_id' \
  -s 'config."claim.name"=tumiki.org_id' \
  -s 'config."jsonType.label"=String' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true'

# Protocol Mapper: is_org_admin
kcadm.sh create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r tumiki \
  -s name=is_org_admin \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_is_org_admin' \
  -s 'config."claim.name"=tumiki.is_org_admin' \
  -s 'config."jsonType.label"=boolean' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true'

# Protocol Mapper: user_db_id
kcadm.sh create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r tumiki \
  -s name=user_db_id \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_user_db_id' \
  -s 'config."claim.name"=tumiki.user_db_id' \
  -s 'config."jsonType.label"=String' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true'

# ClientにClient Scopeを割り当て
kcadm.sh update clients/$CLIENT_ID/default-client-scopes/$CLIENT_SCOPE_ID \
  -r tumiki
```

#### 1.3 ユーザー属性の設定

Auth.jsのWebhook（Post-Login Action）で、ユーザー登録時にKeycloakのUser Attributesを設定:

```typescript
// apps/manager/src/server/auth.ts (callbacks.signIn 拡張)
async signIn({ user, account, profile }) {
  if (account?.provider === "keycloak") {
    // DBからユーザー情報を取得
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        organizationMembers: {
          where: { organization: { isPersonal: true } },
          include: { organization: true },
        },
      },
    });

    const personalOrg = dbUser.organizationMembers[0]?.organization;

    // Keycloakのユーザー属性を更新
    await updateKeycloakUserAttributes(account.providerAccountId, {
      tumiki_org_id: personalOrg.id,
      tumiki_is_org_admin: dbUser.organizationMembers[0]?.isAdmin,
      tumiki_user_db_id: user.id,
    });
  }

  return true;
}
```

---

### 2. DB側権限管理の実装

#### 2.1 既存モデルの活用

Tumikiには既に詳細な権限管理モデルが実装されています（`packages/db/prisma/schema/organization.prisma`）:

```prisma
// 組織
model Organization {
  id         String   @id @default(cuid())
  name       String
  isPersonal Boolean  @default(false)
  members    OrganizationMember[]
  roles      OrganizationRole[]
  // ...
}

// 組織メンバー
model OrganizationMember {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  isAdmin        Boolean      @default(false)
  roleId         String?
  role           OrganizationRole?
  // ...
}

// ロール定義
model OrganizationRole {
  id          String            @id @default(cuid())
  name        String
  permissions RolePermission[]
  // ...
}

// ロール権限
model RolePermission {
  id           String           @id @default(cuid())
  roleId       String
  resourceType ResourceType     // MCP_SERVER_INSTANCE, TOOL_GROUP など
  action       PermissionAction // CREATE, READ, UPDATE, DELETE, MANAGE
  // ...
}

// リソースアクセス制御
model ResourceAccessControl {
  id               String   @id @default(cuid())
  resourceType     ResourceType
  resourceId       String
  memberId         String?
  groupId          String?
  allowedActions   PermissionAction[]
  deniedActions    PermissionAction[]  // 拒否が優先
  // ...
}
```

**3層の権限管理**:
1. **ロールレベル**: `OrganizationRole` → `RolePermission`
2. **グループレベル**: `OrganizationGroup` → `ResourceAccessControl`
3. **メンバーレベル**: `OrganizationMember` → `ResourceAccessControl`

#### 2.2 UserMcpServerInstance検索ロジックの実装

**新規ファイル**: `apps/mcp-proxy/src/services/instanceResolver.ts`

```typescript
import { db } from "@tumiki/db";
import type { UserMcpServerInstance } from "@tumiki/db";
import type { JWTPayload } from "../types/jwt";
import { TRPCError } from "@trpc/server";

/**
 * JWTペイロードからUserMcpServerInstanceを解決
 *
 * ユーザーごとに1つのOAuth専用インスタンスを取得。
 * インスタンスが存在しない場合はエラーを返す。
 */
export async function resolveUserMcpServerInstance(
  jwtPayload: JWTPayload
): Promise<UserMcpServerInstance> {
  const { tumiki } = jwtPayload;

  if (!tumiki?.user_db_id || !tumiki?.org_id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "JWT payload missing required tumiki claims",
    });
  }

  // ユーザー固有のOAuth認証インスタンスを取得
  const instance = await db.userMcpServerInstance.findFirst({
    where: {
      userId: tumiki.user_db_id,
      organizationId: tumiki.org_id,
      authType: { in: ["OAUTH", "BOTH"] },
      deletedAt: null,
      serverStatus: "RUNNING", // 実行中のインスタンスのみ
    },
    include: {
      toolGroup: {
        include: {
          userToolGroupTools: {
            include: {
              tool: true,
            },
          },
        },
      },
    },
  });

  if (!instance) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No OAuth MCP Server instance found for user ${tumiki.user_db_id} in organization ${tumiki.org_id}`,
    });
  }

  return instance;
}

/**
 * インスタンスIDから設定を取得（キャッシュ優先）
 *
 * 既存のgetUserMcpServerConfigFromCacheと統合して使用。
 */
export async function getInstanceConfig(
  instanceId: string,
  useCache: boolean = true
) {
  // 既存のキャッシュロジックを活用
  // apps/mcp-proxy/src/utils/getServerConfig.ts の実装を参照
  // ...
}
```

#### 2.3 権限検証サービスの実装

**新規ファイル**: `apps/mcp-proxy/src/services/permissionService.ts`

```typescript
import { db } from "@tumiki/db";
import type { ResourceType, PermissionAction } from "@tumiki/db";
import { redis } from "../lib/redis";

/**
 * リソースに対するアクセス権限をチェック
 *
 * @param userId - ユーザーID（DB主キー）
 * @param orgId - 組織ID
 * @param resourceType - リソースタイプ
 * @param action - 実行アクション
 * @returns 権限があればtrue
 */
export async function checkPermission(
  userId: string,
  orgId: string,
  resourceType: ResourceType,
  action: PermissionAction
): Promise<boolean> {
  // キャッシュキー
  const cacheKey = `permission:${userId}:${orgId}:${resourceType}:${action}`;

  // キャッシュ確認
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return cached === "1";
  }

  // DB権限チェック
  const member = await db.organizationMember.findFirst({
    where: {
      userId,
      organizationId: orgId,
    },
    include: {
      role: {
        include: {
          permissions: {
            where: {
              resourceType,
              action,
            },
          },
        },
      },
    },
  });

  const hasPermission =
    member?.isAdmin || // 管理者は全権限
    (member?.role?.permissions.length ?? 0) > 0;

  // キャッシュに保存（5分）
  await redis.setex(cacheKey, 300, hasPermission ? "1" : "0");

  return hasPermission;
}

/**
 * 権限キャッシュを無効化
 *
 * 権限変更時に呼び出す。
 */
export async function invalidatePermissionCache(
  userId: string,
  orgId: string
): Promise<void> {
  const pattern = `permission:${userId}:${orgId}:*`;
  const keys = await redis.keys(pattern);

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

### 3. ProxyServer認証ミドルウェアの改善

#### 3.1 ハードコード値の削除

**対象ファイル**: `apps/mcp-proxy/src/middleware/auth.ts`

**修正前（問題のあるコード）**:

```typescript
// JWT認証成功時
const jwtPayload = c.get("jwtPayload") as JWTPayload;

// ❌ 問題: ハードコード値
const authInfo: AuthInfo = {
  organizationId: jwtPayload.organization_id ?? "default-org",
  mcpServerInstanceId: "jwt-instance",  // ハードコード
  apiKeyId: "jwt-api-key",              // ハードコード
  apiKey: "jwt-token",                   // ハードコード
};
```

**修正後**:

```typescript
import { resolveUserMcpServerInstance } from "../services/instanceResolver";

// JWT認証成功時
const jwtPayload = c.get("jwtPayload") as JWTPayload;

// ✅ 改善: 実際のインスタンスを解決
const instance = await resolveUserMcpServerInstance(jwtPayload);

const authInfo: AuthInfo = {
  organizationId: jwtPayload.tumiki.org_id,
  mcpServerInstanceId: instance.id,
  apiKeyId: `jwt_${jwtPayload.sub}`,     // 仮想APIキーID（ログ記録用）
  apiKey: extractBearerToken(c),          // 実際のJWTトークン
};
```

#### 3.2 統合認証ミドルウェアのリファクタリング

**単一責任原則に基づく分離**:

```typescript
/**
 * 認証方式を判定
 */
function detectAuthType(c: Context): "jwt" | "apikey" | null {
  const authHeader = c.req.header("Authorization");
  const apiKeyHeader = c.req.header("X-API-Key");

  if (authHeader?.startsWith("Bearer eyJ")) {
    return "jwt";  // JWT形式（base64エンコードされたJSON）
  }

  if (authHeader?.startsWith("Bearer tumiki_") || apiKeyHeader) {
    return "apikey";  // Tumiki APIキー
  }

  return null;
}

/**
 * JWT認証を実行
 */
async function authenticateWithJWT(c: Context): Promise<AuthInfo> {
  const jwtPayload = c.get("jwtPayload") as JWTPayload;

  if (!jwtPayload) {
    throw new Error("JWT payload not found in context");
  }

  // インスタンス解決
  const instance = await resolveUserMcpServerInstance(jwtPayload);

  return {
    organizationId: jwtPayload.tumiki.org_id,
    mcpServerInstanceId: instance.id,
    apiKeyId: `jwt_${jwtPayload.sub}`,
    apiKey: extractBearerToken(c),
  };
}

/**
 * APIキー認証を実行（既存ロジック）
 */
async function authenticateWithAPIKey(c: Context): Promise<AuthInfo> {
  // 既存の実装を維持
  // ...
}

/**
 * 統合認証ミドルウェア
 */
export const integratedAuthMiddleware = async (c: Context, next: Next) => {
  const authType = detectAuthType(c);

  if (!authType) {
    return createAuthErrorResponse(
      null,
      -32001,
      "Missing authentication credentials"
    );
  }

  try {
    const authInfo = authType === "jwt"
      ? await authenticateWithJWT(c)
      : await authenticateWithAPIKey(c);

    c.set("authInfo", authInfo);
    await next();
  } catch (error) {
    logger.error("Authentication failed", { error, authType });
    return createAuthErrorResponse(
      null,
      -32001,
      "Authentication failed"
    );
  }
};
```

#### 3.3 エラーハンドリングの統一

**対象ファイル**: `apps/mcp-proxy/src/utils/jsonRpcError.ts`

```typescript
/**
 * 認証エラーレスポンスを生成（統一形式）
 */
export function createAuthErrorResponse(
  id: string | number | null,
  code: number,
  message: string
) {
  const statusCode = code === -32001 ? 401 : 403;

  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  } as const;
}

/**
 * 権限エラーレスポンスを生成
 */
export function createPermissionErrorResponse(
  id: string | number | null,
  resourceType: string,
  action: string
) {
  return createAuthErrorResponse(
    id,
    -32003,
    `Permission denied: ${action} on ${resourceType}`
  );
}
```

---

### 4. キャッシュ戦略の実装

#### 4.1 権限キャッシュ

**Redis設定**:
- **キー**: `permission:{userId}:{orgId}:{resourceType}:{action}`
- **値**: `"1"` (許可) / `"0"` (拒否)
- **TTL**: 300秒（5分）
- **無効化**: 権限変更時にパターン削除

**実装例** (上記 `permissionService.ts` を参照):

```typescript
// キャッシュに保存
await redis.setex(cacheKey, 300, hasPermission ? "1" : "0");

// パターンマッチで一括削除
const pattern = `permission:${userId}:${orgId}:*`;
const keys = await redis.keys(pattern);
await redis.del(...keys);
```

#### 4.2 インスタンス設定キャッシュ

**既存のキャッシュ機構を拡張**:

`apps/mcp-proxy/src/utils/getServerConfig.ts` の実装を活用:

```typescript
// JWT認証でも同じキャッシュ機構を使用
const config = await getConfigFromCache(instance.id);

// キー: config:{instanceId}
// 暗号化: AES-256-GCM
// TTL: 300秒
```

---

### 5. 開発環境バイパスの改善

#### 5.1 セキュリティ強化

**対象ファイル**: `apps/mcp-proxy/src/middleware/keycloakAuth.ts`

**修正前（問題のあるコード）**:

```typescript
// ❌ 環境変数偽装のリスク
if (
  process.env.NODE_ENV === "development" &&
  process.env.DEV_MODE === "true"
) {
  // バイパス処理
}
```

**修正後**:

```typescript
/**
 * 開発環境バイパスの判定（セキュリティ強化版）
 */
function shouldBypassAuth(c: Context): boolean {
  const isDevelopment = process.env.NODE_ENV === "development";

  // ホスト名チェック
  const url = new URL(c.req.url);
  const isLocalhost = ["localhost", "127.0.0.1", "local.tumiki.cloud"].includes(
    url.hostname
  );

  // 明示的な開発モードフラグ
  const isDevModeExplicit = process.env.DEV_MODE === "true";

  // 3つの条件すべてが真の場合のみバイパス
  return isDevelopment && isLocalhost && isDevModeExplicit;
}

// ミドルウェア内で使用
if (shouldBypassAuth(c)) {
  logger.warn("🔓 Development mode: JWT authentication bypassed", {
    hostname: new URL(c.req.url).hostname,
  });

  // ダミーペイロード設定
  c.set("jwtPayload", {
    sub: "dev-user-id",
    tumiki: {
      org_id: "dev-org-id",
      is_org_admin: true,
      user_db_id: "dev-user-db-id",
    },
  });

  return await next();
}
```

---

### 6. 型定義の改善

#### 6.1 JWTPayload型の定義

**新規ファイル**: `apps/mcp-proxy/src/types/jwt.ts`

```typescript
/**
 * Tumikiカスタムクレーム
 */
export type TumikiJWTClaims = {
  org_id: string;
  is_org_admin: boolean;
  user_db_id: string;
};

/**
 * Keycloak JWT ペイロード
 */
export type JWTPayload = {
  // 標準クレーム
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;

  // Keycloak標準
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [client: string]: {
      roles: string[];
    };
  };

  // Tumikiカスタムクレーム
  tumiki: TumikiJWTClaims;
};
```

#### 6.2 AuthInfo型の拡張（オプション）

**対象ファイル**: `apps/mcp-proxy/src/types/index.ts`

```typescript
export type AuthInfo = {
  organizationId: string;
  mcpServerInstanceId: string;
  apiKeyId: string;
  apiKey: string;

  // オプション: 認証方式を明示
  authMethod?: "jwt" | "apikey";

  // オプション: JWT認証時のユーザーID
  userId?: string;
};
```

---

## 📊 実装順序

### Phase 1: 基盤整備（Critical） - 優先度: 最高

1. **JWT構造設計とKeycloak設定**
   - Protocol Mapperの設定
   - 初期化スクリプト拡張
   - ユーザー属性の自動設定
   - 推定工数: 4時間

2. **UserMcpServerInstance検索ロジック**
   - `instanceResolver.ts` 作成
   - エラーハンドリング
   - 推定工数: 2時間

3. **ハードコード値の削除**
   - `auth.ts` 修正
   - `authenticateWithJWT` 実装
   - 推定工数: 2時間

4. **エラーハンドリング統一**
   - `jsonRpcError.ts` 拡張
   - 一貫性のあるレスポンス形式
   - 推定工数: 1時間

**Phase 1 合計**: 約9時間

---

### Phase 2: 権限管理（High） - 優先度: 高

5. **権限検証サービス実装**
   - `permissionService.ts` 作成
   - DB権限チェックロジック
   - 推定工数: 3時間

6. **キャッシュ戦略実装**
   - Redis権限キャッシュ
   - インスタンス設定キャッシュ統合
   - 推定工数: 2時間

7. **認証ミドルウェアリファクタリング**
   - 単一責任原則に基づく分離
   - `detectAuthType` / `authenticateWithJWT` / `authenticateWithAPIKey`
   - 推定工数: 3時間

**Phase 2 合計**: 約8時間

---

### Phase 3: 品質向上（Medium） - 優先度: 中

8. **開発環境バイパス改善**
   - セキュリティ強化版の判定ロジック
   - ホスト名チェック追加
   - 推定工数: 1時間

9. **テストコード整備**
   - `instanceResolver.test.ts`
   - `permissionService.test.ts`
   - `auth.test.ts`
   - カバレッジ100%達成
   - 推定工数: 6時間

10. **型定義改善**
    - `jwt.ts` 作成
    - `AuthInfo` 拡張
    - eslint-disable 削減
    - 推定工数: 1時間

**Phase 3 合計**: 約8時間

---

### Phase 4: ドキュメント（Low） - 優先度: 低

11. **ドキュメント更新**
    - `implementation-plan.md` Phase 2完了反映
    - `jwt-claims-design.md` 作成
    - `permission-management.md` 作成
    - 推定工数: 3時間

**Phase 4 合計**: 約3時間

---

**総工数見積もり**: 約28時間

---

## 🔍 検証項目

実装完了後、以下の項目を検証してください：

### 機能検証

- [ ] JWT認証でMCPツールを呼び出せる
- [ ] 正しい `UserMcpServerInstance` が解決される
- [ ] `tumiki` カスタムクレームが正しく含まれる
- [ ] 組織IDとユーザーIDが正確に取得される
- [ ] 権限がない場合に403エラーが返る
- [ ] API Key認証と並行して動作する

### セキュリティ検証

- [ ] 開発環境バイパスが本番で無効化される
- [ ] ハードコード値が完全に削除されている
- [ ] JWT署名検証が正しく機能する
- [ ] 不正なトークンが拒否される

### パフォーマンス検証

- [ ] 権限キャッシュが機能する（Redis）
- [ ] インスタンス設定キャッシュが機能する
- [ ] DB問い合わせ回数が最小化されている

### コード品質検証

- [ ] `pnpm format:fix` 成功
- [ ] `pnpm lint:fix` 成功（eslint-disable最小化）
- [ ] `pnpm typecheck` 成功
- [ ] `pnpm test` 成功（カバレッジ100%）
- [ ] `pnpm build` 成功

### レビュー検証

- [ ] Claude Code Review 重要度8以上の指摘なし
- [ ] コードレビュー完了
- [ ] ドキュメントレビュー完了

---

## 📝 変更ファイル一覧

### 新規作成（7ファイル）

1. `apps/mcp-proxy/src/services/instanceResolver.ts`
   - JWT → Instance マッピングロジック

2. `apps/mcp-proxy/src/services/permissionService.ts`
   - 権限検証サービス

3. `apps/mcp-proxy/src/types/jwt.ts`
   - JWT型定義

4. `apps/mcp-proxy/src/middleware/auth.test.ts`
   - 認証ミドルウェアのテスト

5. `apps/mcp-proxy/src/services/instanceResolver.test.ts`
   - インスタンス解決ロジックのテスト

6. `apps/mcp-proxy/src/services/permissionService.test.ts`
   - 権限検証サービスのテスト

7. `docs/auth/keycloak/jwt-claims-design.md`
   - JWT Claims設計ドキュメント（本ドキュメントとは別）

### 修正（6ファイル）

1. `apps/mcp-proxy/src/middleware/auth.ts`
   - ハードコード値削除
   - リファクタリング（単一責任原則）
   - `authenticateWithJWT` 実装

2. `apps/mcp-proxy/src/middleware/keycloakAuth.ts`
   - 開発環境バイパスの改善
   - セキュリティ強化

3. `apps/mcp-proxy/src/utils/jsonRpcError.ts`
   - エラーレスポンス統一
   - `createAuthErrorResponse` 追加
   - `createPermissionErrorResponse` 追加

4. `apps/mcp-proxy/src/types/index.ts`
   - `AuthInfo` 型拡張（オプション）

5. `docker/keycloak/init-scripts/setup-tumiki.sh`
   - Protocol Mapper設定追加
   - Client Scope作成

6. `docs/auth/keycloak/implementation-plan.md`
   - Phase 2完了状態の反映
   - 新ドキュメントへのリンク追加

---

## 🚀 次のステップ

1. **Phase 1の実装**: 基盤整備から開始
2. **Keycloak設定のテスト**: Protocol Mapperが正しく動作するか確認
3. **統合テスト**: JWT認証フロー全体のテスト
4. **段階的デプロイ**: 開発環境 → ステージング → 本番

---

## 📚 関連ドキュメント

- [Keycloak実装計画](./implementation-plan.md) - 全体的な実装ロードマップ
- [JWT Claims設計](./jwt-claims-design.md) - JWT構造の詳細仕様
- [権限管理ガイド](../permission-management.md) - Tumikiの権限管理アーキテクチャ
- [二層OAuth実装計画](../two-tier-oauth-implementation-plan.md) - 配信機能のOAuth設計

---

**最終更新**: 2025-11-05
