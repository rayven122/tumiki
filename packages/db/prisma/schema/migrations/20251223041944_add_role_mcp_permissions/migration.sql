-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_organizationId_roleSlug_fkey";

-- DropTable (RolePermission is empty in production)
DROP TABLE "RolePermission";

-- DropEnum
DROP TYPE "ResourceType";

-- Step 1: Add organizationSlug as nullable first
ALTER TABLE "OrganizationRole" ADD COLUMN "organizationSlug" TEXT;

-- Step 2: Populate organizationSlug from Organization table via organizationId
UPDATE "OrganizationRole" AS r
SET "organizationSlug" = o."slug"
FROM "Organization" AS o
WHERE r."organizationId" = o."id";

-- Step 3: Make organizationSlug NOT NULL after data is populated
ALTER TABLE "OrganizationRole" ALTER COLUMN "organizationSlug" SET NOT NULL;

-- Step 4: Add default permission columns
ALTER TABLE "OrganizationRole"
ADD COLUMN "defaultExecute" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "defaultRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "defaultWrite" BOOLEAN NOT NULL DEFAULT false;

-- Step 5: Drop old FK and PK
ALTER TABLE "OrganizationRole" DROP CONSTRAINT "OrganizationRole_organizationId_fkey";
ALTER TABLE "OrganizationRole" DROP CONSTRAINT "OrganizationRole_pkey";

-- Step 6: Drop old column
ALTER TABLE "OrganizationRole" DROP COLUMN "organizationId";

-- Step 7: Add new PK
ALTER TABLE "OrganizationRole" ADD CONSTRAINT "OrganizationRole_pkey" PRIMARY KEY ("organizationSlug", "slug");

-- Step 8: Add new FK
ALTER TABLE "OrganizationRole" ADD CONSTRAINT "OrganizationRole_organizationSlug_fkey" FOREIGN KEY ("organizationSlug") REFERENCES "Organization"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: McpPermission
CREATE TABLE "McpPermission" (
    "id" TEXT NOT NULL,
    "organizationSlug" TEXT NOT NULL,
    "roleSlug" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "write" BOOLEAN NOT NULL DEFAULT false,
    "execute" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpPermission_organizationSlug_roleSlug_mcpServerId_key" ON "McpPermission"("organizationSlug", "roleSlug", "mcpServerId");

-- AddForeignKey
ALTER TABLE "McpPermission" ADD CONSTRAINT "McpPermission_organizationSlug_roleSlug_fkey" FOREIGN KEY ("organizationSlug", "roleSlug") REFERENCES "OrganizationRole"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpPermission" ADD CONSTRAINT "McpPermission_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
