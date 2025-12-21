/*
  Unix型権限への移行マイグレーション

  保持するデータ:
  - Organization (全データ保持)
  - OrganizationMember (全データ保持、isAdminカラムのみ削除)
  - OrganizationInvitation (全データ保持、カラム変更)

  削除して再作成:
  - OrganizationRole (空)
  - RolePermission (空)
  - OrganizationGroup (空)
  - ResourceAccessControl (空)
*/

-- ========================================
-- Step 1: 空のテーブルを先に削除
-- ========================================
-- ResourceType enumを使用しているテーブルを先に削除
DROP TABLE IF EXISTS "RolePermission" CASCADE;
DROP TABLE IF EXISTS "OrganizationRole" CASCADE;
DROP TABLE IF EXISTS "ResourceAccessControl" CASCADE;
DROP TABLE IF EXISTS "OrganizationGroup" CASCADE;
DROP TABLE IF EXISTS "_OrganizationGroupToOrganizationMember" CASCADE;
DROP TABLE IF EXISTS "_OrganizationGroupToOrganizationRole" CASCADE;
DROP TABLE IF EXISTS "_OrganizationMemberToOrganizationRole" CASCADE;

-- ========================================
-- Step 2: ResourceType enumの変更
-- ========================================
-- テーブル削除後なので、安全にenum変更可能
BEGIN;
CREATE TYPE "ResourceType_new" AS ENUM ('MCP_SERVER_CONFIG', 'MCP_SERVER', 'MCP_SERVER_TEMPLATE');
ALTER TYPE "ResourceType" RENAME TO "ResourceType_old";
ALTER TYPE "ResourceType_new" RENAME TO "ResourceType";
DROP TYPE "ResourceType_old";
COMMIT;

-- ========================================
-- Step 3: PermissionAction enumを削除
-- ========================================
DROP TYPE IF EXISTS "PermissionAction";

-- ========================================
-- Step 4: OrganizationMemberの変更
-- ========================================
-- isAdminカラムを削除（行データは保持）
ALTER TABLE "OrganizationMember" DROP COLUMN IF EXISTS "isAdmin";

-- ========================================
-- Step 5: OrganizationInvitationの変更
-- ========================================
ALTER TABLE "OrganizationInvitation"
DROP COLUMN IF EXISTS "groupIds",
DROP COLUMN IF EXISTS "isAdmin",
DROP COLUMN IF EXISTS "roleIds",
ADD COLUMN IF NOT EXISTS "roles" TEXT[] DEFAULT ARRAY['Member']::TEXT[];

-- ========================================
-- Step 6: McpConfig, McpOAuthTokenの変更
-- ========================================
-- McpConfigからmcpServerTemplateIdを削除
ALTER TABLE "McpConfig" DROP COLUMN IF EXISTS "mcpServerTemplateId";

-- NULL値を削除してから NOT NULL 制約を追加
DELETE FROM "McpConfig" WHERE "mcpServerTemplateInstanceId" IS NULL;
ALTER TABLE "McpConfig" ALTER COLUMN "mcpServerTemplateInstanceId" SET NOT NULL;

DELETE FROM "McpOAuthToken" WHERE "mcpServerTemplateInstanceId" IS NULL;
ALTER TABLE "McpOAuthToken" ALTER COLUMN "mcpServerTemplateInstanceId" SET NOT NULL;

-- ========================================
-- Step 7: OrganizationRoleを新しいスキーマで作成
-- ========================================
CREATE TABLE "OrganizationRole" (
  "organizationId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationRole_pkey" PRIMARY KEY ("organizationId", "slug"),
  CONSTRAINT "OrganizationRole_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique制約とインデックス
CREATE UNIQUE INDEX "OrganizationRole_organizationId_name_key" ON "OrganizationRole"("organizationId", "name");

-- ========================================
-- Step 8: RolePermissionを新しいスキーマで作成
-- ========================================
CREATE TABLE "RolePermission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "roleSlug" TEXT NOT NULL,
  "resourceType" "ResourceType" NOT NULL,
  "resourceId" TEXT NOT NULL DEFAULT '',
  "read" BOOLEAN NOT NULL DEFAULT false,
  "write" BOOLEAN NOT NULL DEFAULT false,
  "execute" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RolePermission_organizationId_roleSlug_fkey"
    FOREIGN KEY ("organizationId", "roleSlug")
    REFERENCES "OrganizationRole"("organizationId", "slug")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique制約
CREATE UNIQUE INDEX "RolePermission_organizationId_roleSlug_resourceType_resourc_key"
ON "RolePermission"("organizationId", "roleSlug", "resourceType", "resourceId");
