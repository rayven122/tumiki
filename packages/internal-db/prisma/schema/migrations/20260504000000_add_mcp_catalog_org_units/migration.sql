-- CreateEnum
CREATE TYPE "McpCatalogTransportType" AS ENUM ('STDIO', 'SSE', 'STREAMABLE_HTTP');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "scimDepartment" TEXT,
ADD COLUMN "scimManagerValue" TEXT,
ADD COLUMN "scimManagerDisplayName" TEXT;

-- CreateEnum
CREATE TYPE "McpCatalogAuthType" AS ENUM ('NONE', 'API_KEY', 'BEARER', 'OAUTH');

-- CreateEnum
CREATE TYPE "McpCatalogStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "McpToolRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OrgUnitSource" AS ENUM ('SCIM', 'GROUP', 'MANUAL');

-- CreateEnum
CREATE TYPE "PolicyEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "McpCatalog" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transportType" "McpCatalogTransportType" NOT NULL DEFAULT 'STDIO',
    "authType" "McpCatalogAuthType" NOT NULL DEFAULT 'NONE',
    "status" "McpCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "iconPath" TEXT,
    "configTemplate" JSONB NOT NULL DEFAULT '{}',
    "credentialKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "McpCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpCatalogTool" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchema" JSONB NOT NULL DEFAULT '{}',
    "defaultAllowed" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "McpToolRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "McpCatalogTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "source" "OrgUnitSource" NOT NULL DEFAULT 'SCIM',
    "path" TEXT NOT NULL,
    "parentId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrgUnitMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOrgUnitMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnitToolPermission" (
    "id" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnitToolPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpCatalog_slug_key" ON "McpCatalog"("slug");

-- CreateIndex
CREATE INDEX "McpCatalog_deletedAt_idx" ON "McpCatalog"("deletedAt");

-- CreateIndex
CREATE INDEX "McpCatalog_status_idx" ON "McpCatalog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "McpCatalogTool_catalogId_name_key" ON "McpCatalogTool"("catalogId", "name");

-- CreateIndex
CREATE INDEX "McpCatalogTool_deletedAt_idx" ON "McpCatalogTool"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_source_externalId_key" ON "OrgUnit"("source", "externalId");

-- CreateIndex
CREATE INDEX "OrgUnit_parentId_idx" ON "OrgUnit"("parentId");

-- CreateIndex
CREATE INDEX "OrgUnit_path_idx" ON "OrgUnit"("path");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrgUnitMembership_userId_orgUnitId_key" ON "UserOrgUnitMembership"("userId", "orgUnitId");

-- CreateIndex
CREATE INDEX "UserOrgUnitMembership_orgUnitId_idx" ON "UserOrgUnitMembership"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnitToolPermission_orgUnitId_toolId_key" ON "OrgUnitToolPermission"("orgUnitId", "toolId");

-- CreateIndex
CREATE INDEX "OrgUnitToolPermission_catalogId_idx" ON "OrgUnitToolPermission"("catalogId");

-- CreateIndex
CREATE INDEX "OrgUnitToolPermission_effect_idx" ON "OrgUnitToolPermission"("effect");

-- AddForeignKey
ALTER TABLE "McpCatalog" ADD CONSTRAINT "McpCatalog_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpCatalogTool" ADD CONSTRAINT "McpCatalogTool_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgUnitMembership" ADD CONSTRAINT "UserOrgUnitMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgUnitMembership" ADD CONSTRAINT "UserOrgUnitMembership_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnitToolPermission" ADD CONSTRAINT "OrgUnitToolPermission_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnitToolPermission" ADD CONSTRAINT "OrgUnitToolPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnitToolPermission" ADD CONSTRAINT "OrgUnitToolPermission_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "McpCatalogTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
