---
apps:
  - mcp-proxy
severity: medium
difficulty: high
---

# 統合MCPサーバーの権限チェック不足

## 概要

統合MCPサーバー（UnifiedMcpServer）へのアクセスが作成者のみに限定されており、組織内でのロールベースアクセス制御（RBAC）が実装されていない。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/services/permissionService.ts`

## 詳細

### 現状

`index.ts:313-335` で、統合MCPサーバーの認証処理を実装:

```typescript
const handleUnifiedServerAuth = async (
  c: Context<HonoEnv>,
  next: Next,
  server: UnifiedMcpServerInfo,
  userId: string,
): Promise<Response | void> => {
  // 論理削除チェック
  if (server.deletedAt) {
    return c.json(
      createNotFoundError(`Unified MCP Server has been deleted: ${server.id}`),
      404,
    );
  }

  // 作成者チェック（createdBy == userId）
  if (server.createdBy !== userId) {
    return c.json(
      createPermissionDeniedError(
        "Only the creator can access this unified MCP server",
      ),
      403,
    );
  }
  // ...
};
```

`permissionService.ts:20-33` では、簡易的な権限チェックのみ実装:

```typescript
export const checkPermission = async (
  userOrganizationId: string,
  targetOrganizationId: string,
  resourceType: string,
  action: string,
  resourceId?: string,
): Promise<boolean> => {
  // 現在は同じ組織のみアクセス許可
  // Week 3で実装予定：
  // 1. MCPインスタンスが指定された組織に所属しているかDBチェック
  // 2. JWTのrolesに基づいて権限チェック（Owner/Admin/Member/Viewer）

  return userOrganizationId === targetOrganizationId;
};
```

### 問題点

1. **作成者のみのアクセス制限**
   - 統合MCPサーバーは作成者しかアクセスできない
   - チーム内での共有が不可能
   - 作成者が退職した場合にアクセス不能になる

2. **RBACの未実装**
   - `permissionService.ts` のTODOコメントにあるように、ロールベースの権限チェックが未実装
   - Owner/Admin/Member/Viewer の区別がない

3. **委譲機能の欠如**
   - 作成者から他のユーザーへの管理権限の委譲ができない
   - 組織管理者でもアクセスできない

4. **通常MCPサーバーとの一貫性欠如**
   - 通常MCPサーバーは組織メンバーシップベースでアクセス制御
   - 統合MCPサーバーは作成者ベースでアクセス制御
   - 管理者の混乱を招く

### 影響

- **ユーザビリティ**: チームでの統合MCPサーバー共有が不可能
- **運用**: 作成者の退職や異動時に問題
- **一貫性**: 異なるリソースタイプで異なるアクセス制御モデル

## 推奨される対策

1. **RBAC の実装**

```typescript
// permissionService.ts
export const checkPermission = async (
  userId: string,
  organizationId: string,
  resourceType: ResourceType,
  action: Action,
  resourceId?: string,
): Promise<boolean> => {
  // 組織内でのロールを取得
  const membership = await db.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { role: true },
  });

  if (!membership) return false;

  // ロールベースの権限マトリックス
  const permissionMatrix: Record<Role, Record<ResourceType, Action[]>> = {
    OWNER: { UNIFIED_SERVER: ["READ", "WRITE", "DELETE", "SHARE"] },
    ADMIN: { UNIFIED_SERVER: ["READ", "WRITE", "DELETE", "SHARE"] },
    MEMBER: { UNIFIED_SERVER: ["READ", "WRITE"] },
    VIEWER: { UNIFIED_SERVER: ["READ"] },
  };

  return (
    permissionMatrix[membership.role][resourceType]?.includes(action) ?? false
  );
};
```

2. **共有設定の追加**

```typescript
// 統合MCPサーバーに共有設定を追加
model UnifiedMcpServer {
  // 既存フィールド
  sharedWith  UnifiedMcpServerShare[]
}

model UnifiedMcpServerShare {
  id                String   @id @default(cuid())
  unifiedMcpServerId String
  userId            String
  permission        Permission // READ, WRITE, ADMIN
}
```

3. **組織管理者のオーバーライド**

```typescript
// 組織管理者は全ての統合MCPサーバーにアクセス可能
const isOrgAdmin = await checkOrganizationRole(userId, organizationId, [
  "OWNER",
  "ADMIN",
]);
if (isOrgAdmin) {
  return true;
}
```

4. **所有権の移譲機能**

```typescript
// 作成者の変更API
await db.unifiedMcpServer.update({
  where: { id: serverId },
  data: { createdBy: newOwnerId },
});
```

## 関連ファイル

- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/services/permissionService.ts`
- `packages/db/prisma/schema/mcpServer.prisma`
