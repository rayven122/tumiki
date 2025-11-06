# Tumiki 権限管理アーキテクチャ

## 📋 概要

本ドキュメントでは、Tumiki における包括的な権限管理アーキテクチャについて説明します。

### 権限管理の設計方針

1. **ハイブリッドアプローチ**: Keycloak（認証・粗粒度認可）+ DB（詳細権限管理）
2. **3層の権限管理**: ロール → グループ → メンバーの階層構造
3. **リソースベース**: リソースタイプごとの細粒度なアクセス制御
4. **パフォーマンス**: Redisキャッシュによる高速な権限チェック

---

## 🏗️ アーキテクチャ全体像

```
┌───────────────────────────────────────────────────────────────┐
│ Keycloak                                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 認証 (Authentication)                                     │  │
│  │  - ユーザー名/パスワード                                  │  │
│  │  - Social Login (Google, GitHub, etc.)                  │  │
│  │  - Multi-Factor Authentication                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 粗粒度な認可 (Coarse-grained Authorization)              │  │
│  │  - Realm Roles: admin, user, viewer                    │  │
│  │  - Client Roles: mcp_access, api_user                  │  │
│  │  - Scopes: mcp:access                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ JWT発行                                                   │  │
│  │  {                                                       │  │
│  │    "sub": "user_id",                                    │  │
│  │    "realm_access": { "roles": ["admin"] },             │  │
│  │    "tumiki": {                                          │  │
│  │      "org_id": "org_123",                              │  │
│  │      "is_org_admin": true,                             │  │
│  │      "user_db_id": "user_db_456"                       │  │
│  │    }                                                    │  │
│  │  }                                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            ↓ JWT Token
┌───────────────────────────────────────────────────────────────┐
│ Proxy Server (apps/mcp-proxy)                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ JWT検証                                                   │  │
│  │  - 署名検証 (Keycloak JWKS)                              │  │
│  │  - 有効期限チェック                                       │  │
│  │  - Tumikiカスタムクレーム検証                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 基本的な認可                                              │  │
│  │  - 組織メンバーシップ確認                                 │  │
│  │  - Realmロールチェック                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            ↓ AuthInfo
┌───────────────────────────────────────────────────────────────┐
│ Database + Redis Cache                                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 詳細権限管理 (Fine-grained Authorization)                │  │
│  │                                                           │  │
│  │  レベル1: ロールレベル                                    │  │
│  │   OrganizationRole → RolePermission                    │  │
│  │   例: "admin"ロールはすべてのリソースにMANAGE権限        │  │
│  │                                                           │  │
│  │  レベル2: グループレベル                                  │  │
│  │   OrganizationGroup → ResourceAccessControl            │  │
│  │   例: "Engineering"グループはMCP_SERVER_INSTANCEにREAD  │  │
│  │                                                           │  │
│  │  レベル3: メンバーレベル                                  │  │
│  │   OrganizationMember → ResourceAccessControl           │  │
│  │   例: 特定ユーザーにTOOL_GROUPへのUPDATE権限             │  │
│  │                                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Redis キャッシュ                                          │  │
│  │  Key: permission:{userId}:{orgId}:{resource}:{action}  │  │
│  │  TTL: 5分                                                │  │
│  │  無効化: 権限変更時にパターン削除                         │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## 🗄️ データベーススキーマ

### 組織管理

```prisma
// 組織
model Organization {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  isPersonal Boolean  @default(false)  // 個人組織フラグ

  // リレーション
  members    OrganizationMember[]
  groups     OrganizationGroup[]
  roles      OrganizationRole[]
  mcpServers UserMcpServerInstance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### メンバーシップ管理

```prisma
// 組織メンバー
model OrganizationMember {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  isAdmin        Boolean  @default(false)  // 組織管理者フラグ
  roleId         String?

  // リレーション
  user         User         @relation(...)
  organization Organization @relation(...)
  role         OrganizationRole? @relation(...)
  groups       OrganizationGroupMember[]
  resourceAccess ResourceAccessControl[] @relation("MemberAccess")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, organizationId])
}
```

### グループ管理

```prisma
// 組織グループ（部署、チームなど）
model OrganizationGroup {
  id             String   @id @default(cuid())
  name           String
  description    String?
  organizationId String

  // リレーション
  organization   Organization @relation(...)
  members        OrganizationGroupMember[]
  resourceAccess ResourceAccessControl[] @relation("GroupAccess")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, name])
}

// グループメンバー（中間テーブル）
model OrganizationGroupMember {
  id       String @id @default(cuid())
  groupId  String
  memberId String

  // リレーション
  group  OrganizationGroup  @relation(...)
  member OrganizationMember @relation(...)

  createdAt DateTime @default(now())

  @@unique([groupId, memberId])
}
```

### ロール・権限管理

```prisma
// カスタムロール
model OrganizationRole {
  id             String   @id @default(cuid())
  name           String
  description    String?
  organizationId String
  isSystem       Boolean  @default(false)  // システム定義ロール

  // リレーション
  organization Organization @relation(...)
  permissions  RolePermission[]
  members      OrganizationMember[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, name])
}

// ロールに付与される権限
model RolePermission {
  id           String           @id @default(cuid())
  roleId       String
  resourceType ResourceType     // リソースタイプ
  action       PermissionAction // アクション

  // リレーション
  role OrganizationRole @relation(...)

  createdAt DateTime @default(now())

  @@unique([roleId, resourceType, action])
}

// リソースタイプ列挙型
enum ResourceType {
  GROUP                 // グループ管理
  MEMBER                // メンバー管理
  ROLE                  // ロール管理
  MCP_SERVER_CONFIG     // MCPサーバー設定（テンプレート）
  TOOL_GROUP            // ツールグループ
  MCP_SERVER_INSTANCE   // MCPサーバーインスタンス
  API_KEY               // APIキー
  CHAT                  // チャット
}

// アクション列挙型
enum PermissionAction {
  CREATE  // 作成
  READ    // 読み取り
  UPDATE  // 更新
  DELETE  // 削除
  MANAGE  // 管理（すべての権限）
}
```

### リソースアクセス制御

```prisma
// 特定リソースへの細粒度なアクセス制御
model ResourceAccessControl {
  id             String   @id @default(cuid())
  resourceType   ResourceType
  resourceId     String   // 実際のリソースID
  organizationId String

  // アクセス対象（メンバーまたはグループ）
  memberId String?
  groupId  String?

  // 許可・拒否アクション
  allowedActions PermissionAction[]
  deniedActions  PermissionAction[]  // 拒否が優先

  // リレーション
  organization Organization        @relation(...)
  member       OrganizationMember? @relation("MemberAccess", ...)
  group        OrganizationGroup?  @relation("GroupAccess", ...)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([resourceType, resourceId])
  @@index([organizationId, memberId])
  @@index([organizationId, groupId])
}
```

---

## 🔐 権限チェックロジック

### 権限判定の優先順位

権限チェックは以下の順序で評価されます（上から順に優先）：

1. **組織管理者**: `OrganizationMember.isAdmin = true` → すべての権限
2. **拒否アクセス**: `ResourceAccessControl.deniedActions` → 拒否
3. **許可アクセス**: `ResourceAccessControl.allowedActions` → 許可
4. **ロール権限**: `RolePermission` → 許可
5. **デフォルト**: 拒否

### 実装例

```typescript
// apps/mcp-proxy/src/services/permissionService.ts

import { db } from "@tumiki/db";
import type { ResourceType, PermissionAction } from "@tumiki/db";
import { redis } from "../lib/redis";
import { logger } from "../utils/logger";

/**
 * リソースに対するアクセス権限をチェック
 *
 * @param userId - ユーザーID（DB主キー）
 * @param orgId - 組織ID
 * @param resourceType - リソースタイプ
 * @param action - 実行アクション
 * @param resourceId - リソースID（オプション、特定リソースの場合）
 * @returns 権限があればtrue
 */
export async function checkPermission(
  userId: string,
  orgId: string,
  resourceType: ResourceType,
  action: PermissionAction,
  resourceId?: string
): Promise<boolean> {
  // キャッシュキー
  const cacheKey = resourceId
    ? `permission:${userId}:${orgId}:${resourceType}:${resourceId}:${action}`
    : `permission:${userId}:${orgId}:${resourceType}:${action}`;

  // キャッシュ確認
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      logger.debug("Permission cache hit", { cacheKey, result: cached });
      return cached === "1";
    }
  } catch (error) {
    logger.error("Redis cache error", { error });
    // キャッシュエラー時はフォールスルー（DB直接アクセス）
  }

  // DB権限チェック
  const hasPermission = await checkPermissionFromDB(
    userId,
    orgId,
    resourceType,
    action,
    resourceId
  );

  // キャッシュに保存（5分）
  try {
    await redis.setex(cacheKey, 300, hasPermission ? "1" : "0");
  } catch (error) {
    logger.error("Redis cache save error", { error });
  }

  return hasPermission;
}

/**
 * DBから権限をチェック（実際のロジック）
 */
async function checkPermissionFromDB(
  userId: string,
  orgId: string,
  resourceType: ResourceType,
  action: PermissionAction,
  resourceId?: string
): Promise<boolean> {
  // 1. メンバーシップと基本情報を取得
  const member = await db.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
      groups: {
        include: {
          group: {
            include: {
              resourceAccess: true,
            },
          },
        },
      },
      resourceAccess: true,
    },
  });

  if (!member) {
    logger.warn("User is not a member of organization", { userId, orgId });
    return false;
  }

  // 2. 組織管理者チェック → すべての権限
  if (member.isAdmin) {
    logger.debug("User is org admin, granting permission", { userId, orgId });
    return true;
  }

  // 3. 特定リソースのアクセス制御チェック（拒否が優先）
  if (resourceId) {
    // メンバー個人への拒否
    const memberDeny = member.resourceAccess.find(
      (rac) =>
        rac.resourceType === resourceType &&
        rac.resourceId === resourceId &&
        rac.deniedActions.includes(action)
    );

    if (memberDeny) {
      logger.debug("Permission denied by member-level access control", {
        userId,
        resourceType,
        resourceId,
        action,
      });
      return false;
    }

    // グループレベルの拒否
    for (const { group } of member.groups) {
      const groupDeny = group.resourceAccess.find(
        (rac) =>
          rac.resourceType === resourceType &&
          rac.resourceId === resourceId &&
          rac.deniedActions.includes(action)
      );

      if (groupDeny) {
        logger.debug("Permission denied by group-level access control", {
          userId,
          groupId: group.id,
          resourceType,
          resourceId,
          action,
        });
        return false;
      }
    }

    // メンバー個人への許可
    const memberAllow = member.resourceAccess.find(
      (rac) =>
        rac.resourceType === resourceType &&
        rac.resourceId === resourceId &&
        rac.allowedActions.includes(action)
    );

    if (memberAllow) {
      logger.debug("Permission granted by member-level access control", {
        userId,
        resourceType,
        resourceId,
        action,
      });
      return true;
    }

    // グループレベルの許可
    for (const { group } of member.groups) {
      const groupAllow = group.resourceAccess.find(
        (rac) =>
          rac.resourceType === resourceType &&
          rac.resourceId === resourceId &&
          rac.allowedActions.includes(action)
      );

      if (groupAllow) {
        logger.debug("Permission granted by group-level access control", {
          userId,
          groupId: group.id,
          resourceType,
          resourceId,
          action,
        });
        return true;
      }
    }
  }

  // 4. ロールレベルの権限チェック
  if (member.role) {
    const rolePermission = member.role.permissions.find(
      (perm) => perm.resourceType === resourceType && perm.action === action
    );

    if (rolePermission) {
      logger.debug("Permission granted by role", {
        userId,
        roleId: member.role.id,
        roleName: member.role.name,
        resourceType,
        action,
      });
      return true;
    }

    // MANAGE権限は全アクションを含む
    const managePermission = member.role.permissions.find(
      (perm) =>
        perm.resourceType === resourceType && perm.action === "MANAGE"
    );

    if (managePermission) {
      logger.debug("Permission granted by MANAGE role", {
        userId,
        roleId: member.role.id,
        resourceType,
        action,
      });
      return true;
    }
  }

  // 5. デフォルト: 拒否
  logger.debug("Permission denied (no matching rule)", {
    userId,
    orgId,
    resourceType,
    action,
    resourceId,
  });
  return false;
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

  try {
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info("Permission cache invalidated", {
        userId,
        orgId,
        keysDeleted: keys.length,
      });
    }
  } catch (error) {
    logger.error("Failed to invalidate permission cache", { error, userId, orgId });
  }
}

/**
 * 組織全体の権限キャッシュを無効化
 *
 * ロール変更時など、組織全体に影響する場合に使用。
 */
export async function invalidateOrganizationCache(orgId: string): Promise<void> {
  const pattern = `permission:*:${orgId}:*`;

  try {
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info("Organization permission cache invalidated", {
        orgId,
        keysDeleted: keys.length,
      });
    }
  } catch (error) {
    logger.error("Failed to invalidate organization cache", { error, orgId });
  }
}
```

---

## 🎭 ロールの定義

### システム定義ロール

Tumikiでは、以下のシステム定義ロール（`isSystem: true`）を提供します。

#### 1. Owner（所有者）

**権限**:
- すべてのリソースに対する `MANAGE` 権限
- 組織の削除
- 支払い設定

**用途**: 組織作成者、最終的な管理権限

#### 2. Admin（管理者）

**権限**:
- `MCP_SERVER_INSTANCE`: MANAGE
- `TOOL_GROUP`: MANAGE
- `API_KEY`: MANAGE
- `MEMBER`: MANAGE
- `GROUP`: MANAGE
- `ROLE`: READ

**用途**: 日常的な管理業務、メンバー管理

#### 3. Developer（開発者）

**権限**:
- `MCP_SERVER_INSTANCE`: CREATE, READ, UPDATE, DELETE
- `TOOL_GROUP`: CREATE, READ, UPDATE, DELETE
- `API_KEY`: CREATE, READ, UPDATE, DELETE
- `MEMBER`: READ
- `GROUP`: READ

**用途**: MCPサーバーの設定と利用

#### 4. Viewer（閲覧者）

**権限**:
- `MCP_SERVER_INSTANCE`: READ
- `TOOL_GROUP`: READ
- `MEMBER`: READ
- `GROUP`: READ

**用途**: 閲覧のみ、設定変更不可

### カスタムロールの作成

```typescript
// カスタムロール作成例
const customRole = await db.organizationRole.create({
  data: {
    name: "MCP Operator",
    description: "MCPサーバーの操作のみ可能",
    organizationId: "org_123",
    isSystem: false,
    permissions: {
      create: [
        { resourceType: "MCP_SERVER_INSTANCE", action: "READ" },
        { resourceType: "MCP_SERVER_INSTANCE", action: "UPDATE" },
        { resourceType: "TOOL_GROUP", action: "READ" },
      ],
    },
  },
});
```

---

## 🔄 権限変更フロー

### ロール変更時

```typescript
// apps/manager/src/server/api/routers/organization.ts

import { invalidateOrganizationCache } from "@tumiki/mcp-proxy/services/permissionService";

export const organizationRouter = router({
  updateMemberRole: protectedProcedure
    .input(z.object({
      memberId: z.string(),
      roleId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // メンバーのロールを更新
      await ctx.db.organizationMember.update({
        where: { id: input.memberId },
        data: { roleId: input.roleId },
      });

      // メンバー情報を取得
      const member = await ctx.db.organizationMember.findUnique({
        where: { id: input.memberId },
        select: { userId: true, organizationId: true },
      });

      // 権限キャッシュを無効化
      if (member) {
        await invalidatePermissionCache(member.userId, member.organizationId);
      }

      return { success: true };
    }),
});
```

### リソースアクセス制御の変更時

```typescript
// ResourceAccessControl作成・更新時
export const resourceAccessRouter = router({
  grant: protectedProcedure
    .input(z.object({
      resourceType: z.enum([...]),
      resourceId: z.string(),
      memberId: z.string().optional(),
      groupId: z.string().optional(),
      allowedActions: z.array(z.enum([...])),
    }))
    .mutation(async ({ ctx, input }) => {
      // アクセス制御を作成
      await ctx.db.resourceAccessControl.create({
        data: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          organizationId: ctx.session.user.organizationId,
          memberId: input.memberId,
          groupId: input.groupId,
          allowedActions: input.allowedActions,
        },
      });

      // キャッシュ無効化
      if (input.memberId) {
        const member = await ctx.db.organizationMember.findUnique({
          where: { id: input.memberId },
          select: { userId: true, organizationId: true },
        });

        if (member) {
          await invalidatePermissionCache(member.userId, member.organizationId);
        }
      }

      if (input.groupId) {
        // グループメンバー全員のキャッシュを無効化
        const groupMembers = await ctx.db.organizationGroupMember.findMany({
          where: { groupId: input.groupId },
          include: { member: true },
        });

        await Promise.all(
          groupMembers.map(({ member }) =>
            invalidatePermissionCache(member.userId, member.organizationId)
          )
        );
      }

      return { success: true };
    }),
});
```

---

## 🧪 テスト例

### 権限チェックのテスト

```typescript
// apps/mcp-proxy/src/services/permissionService.test.ts

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { checkPermission, invalidatePermissionCache } from "./permissionService";
import { db } from "@tumiki/db";

describe("checkPermission", () => {
  let testOrg: Organization;
  let testUser: User;
  let testMember: OrganizationMember;
  let testRole: OrganizationRole;

  beforeEach(async () => {
    // テストデータ作成
    testOrg = await db.organization.create({
      data: { name: "Test Org", slug: "test-org" },
    });

    testUser = await db.user.create({
      data: { email: "test@example.com", name: "Test User" },
    });

    testRole = await db.organizationRole.create({
      data: {
        name: "Developer",
        organizationId: testOrg.id,
        permissions: {
          create: [
            { resourceType: "MCP_SERVER_INSTANCE", action: "READ" },
            { resourceType: "MCP_SERVER_INSTANCE", action: "UPDATE" },
          ],
        },
      },
    });

    testMember = await db.organizationMember.create({
      data: {
        userId: testUser.id,
        organizationId: testOrg.id,
        roleId: testRole.id,
      },
    });
  });

  afterEach(async () => {
    // クリーンアップ
    await db.organizationMember.deleteMany({});
    await db.organizationRole.deleteMany({});
    await db.user.deleteMany({});
    await db.organization.deleteMany({});
  });

  test("ロール権限でREADアクセスを許可", async () => {
    const result = await checkPermission(
      testUser.id,
      testOrg.id,
      "MCP_SERVER_INSTANCE",
      "READ"
    );

    expect(result).toStrictEqual(true);
  });

  test("ロール権限でCREATEアクセスを拒否", async () => {
    const result = await checkPermission(
      testUser.id,
      testOrg.id,
      "MCP_SERVER_INSTANCE",
      "CREATE"
    );

    expect(result).toStrictEqual(false);
  });

  test("組織管理者は全権限を持つ", async () => {
    await db.organizationMember.update({
      where: { id: testMember.id },
      data: { isAdmin: true },
    });

    const result = await checkPermission(
      testUser.id,
      testOrg.id,
      "MCP_SERVER_INSTANCE",
      "DELETE"
    );

    expect(result).toStrictEqual(true);
  });

  test("拒否アクセスは許可より優先される", async () => {
    // 拒否アクセス制御を追加
    await db.resourceAccessControl.create({
      data: {
        resourceType: "MCP_SERVER_INSTANCE",
        resourceId: "instance_123",
        organizationId: testOrg.id,
        memberId: testMember.id,
        deniedActions: ["READ"],
      },
    });

    const result = await checkPermission(
      testUser.id,
      testOrg.id,
      "MCP_SERVER_INSTANCE",
      "READ",
      "instance_123"
    );

    expect(result).toStrictEqual(false);
  });
});
```

---

## 📚 ユースケース例

### ケース1: 開発チームのMCPサーバー管理

**要件**:
- 開発チーム（Engineering Group）はすべてのMCPサーバーインスタンスを作成・編集可能
- QAチーム（QA Group）は閲覧のみ可能

**設定**:

```typescript
// Engineeringグループ作成
const engGroup = await db.organizationGroup.create({
  data: {
    name: "Engineering",
    organizationId: "org_123",
  },
});

// EngineeringグループにMCP_SERVER_INSTANCEのMANAGE権限を付与
await db.resourceAccessControl.create({
  data: {
    resourceType: "MCP_SERVER_INSTANCE",
    resourceId: "*",  // 全インスタンス
    organizationId: "org_123",
    groupId: engGroup.id,
    allowedActions: ["CREATE", "READ", "UPDATE", "DELETE"],
  },
});

// QAグループ作成
const qaGroup = await db.organizationGroup.create({
  data: {
    name: "QA",
    organizationId: "org_123",
  },
});

// QAグループにREAD権限のみ付与
await db.resourceAccessControl.create({
  data: {
    resourceType: "MCP_SERVER_INSTANCE",
    resourceId: "*",
    organizationId: "org_123",
    groupId: qaGroup.id,
    allowedActions: ["READ"],
  },
});
```

### ケース2: 特定インスタンスへのアクセス制限

**要件**:
- 本番環境のMCPサーバーインスタンスは、特定のメンバーのみ操作可能
- その他のメンバーは閲覧のみ

**設定**:

```typescript
// 本番インスタンスへのデフォルトアクセスを制限
await db.resourceAccessControl.create({
  data: {
    resourceType: "MCP_SERVER_INSTANCE",
    resourceId: "instance_production",
    organizationId: "org_123",
    // groupIdもmemberIdも指定しない = 全員に適用
    deniedActions: ["UPDATE", "DELETE"],
  },
});

// 特定メンバー（DevOps担当）に例外的に許可
await db.resourceAccessControl.create({
  data: {
    resourceType: "MCP_SERVER_INSTANCE",
    resourceId: "instance_production",
    organizationId: "org_123",
    memberId: "member_devops_lead",
    allowedActions: ["UPDATE", "DELETE"],
  },
});
```

---

## 🚀 実装チェックリスト

実装時に確認すべき項目：

### データベース

- [ ] スキーマ定義が正しく反映されている
- [ ] インデックスが適切に設定されている（パフォーマンス）
- [ ] カスケード削除が適切に設定されている

### 権限サービス

- [ ] `checkPermission` が正しく動作する
- [ ] キャッシュが機能する（Redis）
- [ ] キャッシュ無効化が適切に行われる
- [ ] エラーハンドリングが適切

### テスト

- [ ] ユニットテストが全ケースをカバー（100%）
- [ ] 統合テストでエンドツーエンドフローを検証
- [ ] パフォーマンステスト（大量権限チェック）

### ドキュメント

- [ ] 権限管理の全体像が理解できる
- [ ] 実装例が十分に提供されている
- [ ] ユースケースが明確

---

## 📖 関連ドキュメント

- [Keycloak JWT認証 改善実装計画](./keycloak/jwt-authentication-improvement-plan.md)
- [JWT Claims設計](./keycloak/jwt-claims-design.md)
- [二層OAuth実装計画](./two-tier-oauth-implementation-plan.md)

---

**最終更新**: 2025-11-05
