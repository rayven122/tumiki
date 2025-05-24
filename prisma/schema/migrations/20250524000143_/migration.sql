/*
  Warnings:

  - The values [ADMIN,SERVER_MANAGER,VIEWER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `membership` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolGroupTool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserMcpServer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ApiKeyToToolGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ToolToUserMcpServer` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('GROUP', 'MEMBER', 'ROLE', 'MCP_SERVER_CONFIG', 'TOOL_GROUP', 'MCP_SERVER_INSTANCE');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('RUNNING', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "ServerType" AS ENUM ('CUSTOM', 'OFFICIAL');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SYSTEM_ADMIN', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "ToolGroup" DROP CONSTRAINT "ToolGroup_userId_fkey";

-- DropForeignKey
ALTER TABLE "ToolGroupTool" DROP CONSTRAINT "ToolGroupTool_toolGroupId_fkey";

-- DropForeignKey
ALTER TABLE "ToolGroupTool" DROP CONSTRAINT "ToolGroupTool_toolId_fkey";

-- DropForeignKey
ALTER TABLE "ToolGroupTool" DROP CONSTRAINT "ToolGroupTool_userMcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "UserMcpServer" DROP CONSTRAINT "UserMcpServer_mcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "UserMcpServer" DROP CONSTRAINT "UserMcpServer_userId_fkey";

-- DropForeignKey
ALTER TABLE "_ApiKeyToToolGroup" DROP CONSTRAINT "_ApiKeyToToolGroup_A_fkey";

-- DropForeignKey
ALTER TABLE "_ApiKeyToToolGroup" DROP CONSTRAINT "_ApiKeyToToolGroup_B_fkey";

-- DropForeignKey
ALTER TABLE "_ToolToUserMcpServer" DROP CONSTRAINT "_ToolToUserMcpServer_A_fkey";

-- DropForeignKey
ALTER TABLE "_ToolToUserMcpServer" DROP CONSTRAINT "_ToolToUserMcpServer_B_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "membership";

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "ToolGroup";

-- DropTable
DROP TABLE "ToolGroupTool";

-- DropTable
DROP TABLE "UserMcpServer";

-- DropTable
DROP TABLE "_ApiKeyToToolGroup";

-- DropTable
DROP TABLE "_ToolToUserMcpServer";

-- DropEnum
DROP TYPE "MembershipType";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "roleIds" TEXT[],
    "groupIds" TEXT[],
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAccessControl" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "memberId" TEXT,
    "groupId" TEXT,
    "allowedActions" "PermissionAction"[],
    "deniedActions" "PermissionAction"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAccessControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMcpServerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "envVars" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMcpServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserToolGroupTool" (
    "toolGroupId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToolGroupTool_pkey" PRIMARY KEY ("toolGroupId","toolId")
);

-- CreateTable
CREATE TABLE "UserToolGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserToolGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMcpServerInstanceToolGroup" (
    "mcpServerInstanceId" TEXT NOT NULL,
    "toolGroupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMcpServerInstanceToolGroup_pkey" PRIMARY KEY ("mcpServerInstanceId","toolGroupId")
);

-- CreateTable
CREATE TABLE "UserMcpServerInstance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconPath" TEXT,
    "serverStatus" "ServerStatus" NOT NULL,
    "serverType" "ServerType" NOT NULL,
    "toolGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMcpServerInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ToolToUserMcpServerConfig" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ToolToUserMcpServerConfig_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OrganizationMemberToOrganizationRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationMemberToOrganizationRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OrganizationGroupToOrganizationMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationGroupToOrganizationMember_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OrganizationGroupToOrganizationRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationGroupToOrganizationRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserMcpServerConfigToUserMcpServerInstance" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserMcpServerConfigToUserMcpServerInstance_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_organizationId_email_key" ON "OrganizationInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "OrganizationGroup_organizationId_idx" ON "OrganizationGroup"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationGroup_organizationId_name_key" ON "OrganizationGroup"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRole_organizationId_name_key" ON "OrganizationRole"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_resourceType_action_key" ON "RolePermission"("roleId", "resourceType", "action");

-- CreateIndex
CREATE INDEX "ResourceAccessControl_organizationId_resourceType_resourceI_idx" ON "ResourceAccessControl"("organizationId", "resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAccessControl_organizationId_resourceType_resourceI_key" ON "ResourceAccessControl"("organizationId", "resourceType", "resourceId", "memberId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMcpServerInstance_toolGroupId_key" ON "UserMcpServerInstance"("toolGroupId");

-- CreateIndex
CREATE INDEX "_ToolToUserMcpServerConfig_B_index" ON "_ToolToUserMcpServerConfig"("B");

-- CreateIndex
CREATE INDEX "_OrganizationMemberToOrganizationRole_B_index" ON "_OrganizationMemberToOrganizationRole"("B");

-- CreateIndex
CREATE INDEX "_OrganizationGroupToOrganizationMember_B_index" ON "_OrganizationGroupToOrganizationMember"("B");

-- CreateIndex
CREATE INDEX "_OrganizationGroupToOrganizationRole_B_index" ON "_OrganizationGroupToOrganizationRole"("B");

-- CreateIndex
CREATE INDEX "_UserMcpServerConfigToUserMcpServerInstance_B_index" ON "_UserMcpServerConfigToUserMcpServerInstance"("B");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationGroup" ADD CONSTRAINT "OrganizationGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRole" ADD CONSTRAINT "OrganizationRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAccessControl" ADD CONSTRAINT "ResourceAccessControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAccessControl" ADD CONSTRAINT "ResourceAccessControl_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAccessControl" ADD CONSTRAINT "ResourceAccessControl_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerConfig" ADD CONSTRAINT "UserMcpServerConfig_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerConfig" ADD CONSTRAINT "UserMcpServerConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerConfig" ADD CONSTRAINT "UserMcpServerConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToolGroupTool" ADD CONSTRAINT "UserToolGroupTool_toolGroupId_fkey" FOREIGN KEY ("toolGroupId") REFERENCES "UserToolGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToolGroupTool" ADD CONSTRAINT "UserToolGroupTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToolGroup" ADD CONSTRAINT "UserToolGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToolGroup" ADD CONSTRAINT "UserToolGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerInstanceToolGroup" ADD CONSTRAINT "UserMcpServerInstanceToolGroup_mcpServerInstanceId_fkey" FOREIGN KEY ("mcpServerInstanceId") REFERENCES "UserMcpServerInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerInstanceToolGroup" ADD CONSTRAINT "UserMcpServerInstanceToolGroup_toolGroupId_fkey" FOREIGN KEY ("toolGroupId") REFERENCES "UserToolGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerInstance" ADD CONSTRAINT "UserMcpServerInstance_toolGroupId_fkey" FOREIGN KEY ("toolGroupId") REFERENCES "UserToolGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerInstance" ADD CONSTRAINT "UserMcpServerInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServerInstance" ADD CONSTRAINT "UserMcpServerInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolToUserMcpServerConfig" ADD CONSTRAINT "_ToolToUserMcpServerConfig_A_fkey" FOREIGN KEY ("A") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolToUserMcpServerConfig" ADD CONSTRAINT "_ToolToUserMcpServerConfig_B_fkey" FOREIGN KEY ("B") REFERENCES "UserMcpServerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationMemberToOrganizationRole" ADD CONSTRAINT "_OrganizationMemberToOrganizationRole_A_fkey" FOREIGN KEY ("A") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationMemberToOrganizationRole" ADD CONSTRAINT "_OrganizationMemberToOrganizationRole_B_fkey" FOREIGN KEY ("B") REFERENCES "OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationGroupToOrganizationMember" ADD CONSTRAINT "_OrganizationGroupToOrganizationMember_A_fkey" FOREIGN KEY ("A") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationGroupToOrganizationMember" ADD CONSTRAINT "_OrganizationGroupToOrganizationMember_B_fkey" FOREIGN KEY ("B") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationGroupToOrganizationRole" ADD CONSTRAINT "_OrganizationGroupToOrganizationRole_A_fkey" FOREIGN KEY ("A") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationGroupToOrganizationRole" ADD CONSTRAINT "_OrganizationGroupToOrganizationRole_B_fkey" FOREIGN KEY ("B") REFERENCES "OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserMcpServerConfigToUserMcpServerInstance" ADD CONSTRAINT "_UserMcpServerConfigToUserMcpServerInstance_A_fkey" FOREIGN KEY ("A") REFERENCES "UserMcpServerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserMcpServerConfigToUserMcpServerInstance" ADD CONSTRAINT "_UserMcpServerConfigToUserMcpServerInstance_B_fkey" FOREIGN KEY ("B") REFERENCES "UserMcpServerInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
