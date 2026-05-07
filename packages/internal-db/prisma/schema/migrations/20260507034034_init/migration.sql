-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "GroupSource" AS ENUM ('IDP', 'TUMIKI');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('JIT', 'SCIM', 'MANUAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "McpCatalogTransportType" AS ENUM ('STDIO', 'SSE', 'STREAMABLE_HTTP');

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
CREATE TABLE "DesktopAuditLog" (
    "id" TEXT NOT NULL,
    "sourceInstallationId" TEXT,
    "sourceAuditLogId" INTEGER,
    "userId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "connectionName" VARCHAR(255),
    "clientName" VARCHAR(100),
    "clientVersion" VARCHAR(50),
    "transportType" VARCHAR(32),
    "toolName" VARCHAR(255) NOT NULL,
    "method" VARCHAR(64) NOT NULL,
    "httpStatus" SMALLINT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "inputBytes" INTEGER NOT NULL,
    "outputBytes" INTEGER NOT NULL,
    "errorCode" INTEGER,
    "errorSummary" VARCHAR(500),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesktopAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "scimDepartment" TEXT,
    "scimManagerValue" TEXT,
    "scimManagerDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "DesktopApiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "organizationName" TEXT,
    "organizationLogoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesktopApiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectStorageSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "endpoint" TEXT,
    "region" TEXT,
    "bucket" TEXT,
    "publicBaseUrl" TEXT,
    "accessKeyId" TEXT,
    "encryptedSecretAccessKey" TEXT,
    "forcePathStyle" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectStorageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "source" "GroupSource" NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroupMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "source" "GroupSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdpSyncLog" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "trigger" "SyncTrigger" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "added" INTEGER NOT NULL DEFAULT 0,
    "removed" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IdpSyncLog_pkey" PRIMARY KEY ("id")
);

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
    "command" TEXT,
    "args" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url" TEXT,
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
    "externalId" TEXT NOT NULL,
    "source" "OrgUnitSource" NOT NULL DEFAULT 'SCIM',
    "path" TEXT NOT NULL,
    "parentId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnitCatalogPermission" (
    "id" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnitCatalogPermission_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "GroupCatalogPermission" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupCatalogPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCatalogToolPermission" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupCatalogToolPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCatalogPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCatalogPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCatalogToolPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCatalogToolPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesktopAuditLog_userId_occurredAt_idx" ON "DesktopAuditLog"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "DesktopAuditLog_mcpServerId_occurredAt_idx" ON "DesktopAuditLog"("mcpServerId", "occurredAt");

-- CreateIndex
CREATE INDEX "DesktopAuditLog_clientName_occurredAt_idx" ON "DesktopAuditLog"("clientName", "occurredAt");

-- CreateIndex
CREATE INDEX "DesktopAuditLog_connectionName_occurredAt_idx" ON "DesktopAuditLog"("connectionName", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopAuditLog_sourceInstallationId_sourceAuditLogId_key" ON "DesktopAuditLog"("sourceInstallationId", "sourceAuditLogId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_provider_sub_key" ON "ExternalIdentity"("provider", "sub");

-- CreateIndex
CREATE UNIQUE INDEX "Group_provider_externalId_key" ON "Group"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroupMembership_userId_groupId_key" ON "UserGroupMembership"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "McpCatalog_slug_key" ON "McpCatalog"("slug");

-- CreateIndex
CREATE INDEX "McpCatalog_deletedAt_idx" ON "McpCatalog"("deletedAt");

-- CreateIndex
CREATE INDEX "McpCatalog_name_id_idx" ON "McpCatalog"("name", "id");

-- CreateIndex
CREATE INDEX "McpCatalog_status_idx" ON "McpCatalog"("status");

-- CreateIndex
CREATE INDEX "McpCatalogTool_deletedAt_idx" ON "McpCatalogTool"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "McpCatalogTool_catalogId_name_key" ON "McpCatalogTool"("catalogId", "name");

-- CreateIndex
CREATE INDEX "OrgUnit_parentId_idx" ON "OrgUnit"("parentId");

-- CreateIndex
CREATE INDEX "OrgUnit_path_idx" ON "OrgUnit"("path");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_source_externalId_key" ON "OrgUnit"("source", "externalId");

-- CreateIndex
CREATE INDEX "OrgUnitCatalogPermission_catalogId_idx" ON "OrgUnitCatalogPermission"("catalogId");

-- CreateIndex
CREATE INDEX "OrgUnitCatalogPermission_effect_idx" ON "OrgUnitCatalogPermission"("effect");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnitCatalogPermission_orgUnitId_catalogId_key" ON "OrgUnitCatalogPermission"("orgUnitId", "catalogId");

-- CreateIndex
CREATE INDEX "UserOrgUnitMembership_orgUnitId_idx" ON "UserOrgUnitMembership"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrgUnitMembership_userId_orgUnitId_key" ON "UserOrgUnitMembership"("userId", "orgUnitId");

-- CreateIndex
CREATE INDEX "OrgUnitToolPermission_catalogId_idx" ON "OrgUnitToolPermission"("catalogId");

-- CreateIndex
CREATE INDEX "OrgUnitToolPermission_toolId_idx" ON "OrgUnitToolPermission"("toolId");

-- CreateIndex
CREATE INDEX "OrgUnitToolPermission_effect_idx" ON "OrgUnitToolPermission"("effect");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnitToolPermission_orgUnitId_toolId_key" ON "OrgUnitToolPermission"("orgUnitId", "toolId");

-- CreateIndex
CREATE INDEX "GroupCatalogPermission_catalogId_idx" ON "GroupCatalogPermission"("catalogId");

-- CreateIndex
CREATE INDEX "GroupCatalogPermission_effect_idx" ON "GroupCatalogPermission"("effect");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCatalogPermission_groupId_catalogId_key" ON "GroupCatalogPermission"("groupId", "catalogId");

-- CreateIndex
CREATE INDEX "GroupCatalogToolPermission_catalogId_idx" ON "GroupCatalogToolPermission"("catalogId");

-- CreateIndex
CREATE INDEX "GroupCatalogToolPermission_toolId_idx" ON "GroupCatalogToolPermission"("toolId");

-- CreateIndex
CREATE INDEX "GroupCatalogToolPermission_effect_idx" ON "GroupCatalogToolPermission"("effect");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCatalogToolPermission_groupId_toolId_key" ON "GroupCatalogToolPermission"("groupId", "toolId");

-- CreateIndex
CREATE INDEX "UserCatalogPermission_catalogId_idx" ON "UserCatalogPermission"("catalogId");

-- CreateIndex
CREATE INDEX "UserCatalogPermission_effect_idx" ON "UserCatalogPermission"("effect");

-- CreateIndex
CREATE INDEX "UserCatalogPermission_expiresAt_idx" ON "UserCatalogPermission"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCatalogPermission_userId_catalogId_key" ON "UserCatalogPermission"("userId", "catalogId");

-- CreateIndex
CREATE INDEX "UserCatalogToolPermission_catalogId_idx" ON "UserCatalogToolPermission"("catalogId");

-- CreateIndex
CREATE INDEX "UserCatalogToolPermission_toolId_idx" ON "UserCatalogToolPermission"("toolId");

-- CreateIndex
CREATE INDEX "UserCatalogToolPermission_effect_idx" ON "UserCatalogToolPermission"("effect");

-- CreateIndex
CREATE INDEX "UserCatalogToolPermission_expiresAt_idx" ON "UserCatalogToolPermission"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCatalogToolPermission_userId_toolId_key" ON "UserCatalogToolPermission"("userId", "toolId");

-- AddForeignKey
ALTER TABLE "DesktopAuditLog" ADD CONSTRAINT "DesktopAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroupMembership" ADD CONSTRAINT "UserGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroupMembership" ADD CONSTRAINT "UserGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdpSyncLog" ADD CONSTRAINT "IdpSyncLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpCatalog" ADD CONSTRAINT "McpCatalog_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpCatalogTool" ADD CONSTRAINT "McpCatalogTool_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnitCatalogPermission" ADD CONSTRAINT "OrgUnitCatalogPermission_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnitCatalogPermission" ADD CONSTRAINT "OrgUnitCatalogPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "GroupCatalogPermission" ADD CONSTRAINT "GroupCatalogPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCatalogPermission" ADD CONSTRAINT "GroupCatalogPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCatalogToolPermission" ADD CONSTRAINT "GroupCatalogToolPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCatalogToolPermission" ADD CONSTRAINT "GroupCatalogToolPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCatalogToolPermission" ADD CONSTRAINT "GroupCatalogToolPermission_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "McpCatalogTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCatalogPermission" ADD CONSTRAINT "UserCatalogPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCatalogPermission" ADD CONSTRAINT "UserCatalogPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCatalogToolPermission" ADD CONSTRAINT "UserCatalogToolPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCatalogToolPermission" ADD CONSTRAINT "UserCatalogToolPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCatalogToolPermission" ADD CONSTRAINT "UserCatalogToolPermission_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "McpCatalogTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
