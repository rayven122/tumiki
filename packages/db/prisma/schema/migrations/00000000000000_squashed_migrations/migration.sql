
> @tumiki/db@0.1.0 with-env /Users/suzusanhidetoshi/Documents/tumiki-pj/tumiki/packages/db
> dotenv -e ../../.env -- prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema --script

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SYSTEM_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "public"."DocumentKind" AS ENUM ('text', 'code', 'image', 'sheet');

-- CreateEnum
CREATE TYPE "public"."TransportType" AS ENUM ('STDIO', 'SSE', 'STREAMABLE_HTTPS');

-- CreateEnum
CREATE TYPE "public"."AuthType" AS ENUM ('NONE', 'API_KEY', 'OAUTH');

-- CreateEnum
CREATE TYPE "public"."McpServerVisibility" AS ENUM ('PRIVATE', 'ORGANIZATION', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE');

-- CreateEnum
CREATE TYPE "public"."ResourceType" AS ENUM ('GROUP', 'MEMBER', 'ROLE', 'MCP_SERVER_CONFIG', 'TOOL_GROUP', 'MCP_SERVER_INSTANCE');

-- CreateEnum
CREATE TYPE "public"."ServerStatus" AS ENUM ('RUNNING', 'STOPPED', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."ServerType" AS ENUM ('CUSTOM', 'OFFICIAL');

-- CreateTable
CREATE TABLE "public"."McpApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiKeyHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "userMcpServerInstanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "defaultOrganizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Chat" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'private',

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "attachments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vote" (
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "isUpvoted" BOOLEAN NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("chatId","messageId")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "kind" "public"."DocumentKind" NOT NULL DEFAULT 'text',
    "userId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id","createdAt")
);

-- CreateTable
CREATE TABLE "public"."Suggestion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentCreatedAt" TIMESTAMP(3) NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "description" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stream" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconPath" TEXT,
    "transportType" "public"."TransportType" NOT NULL DEFAULT 'STDIO',
    "command" TEXT,
    "args" TEXT[],
    "url" TEXT,
    "envVars" TEXT[],
    "authType" "public"."AuthType" NOT NULL DEFAULT 'NONE',
    "oauthProvider" VARCHAR(50),
    "oauthScopes" TEXT[],
    "serverType" "public"."ServerType" NOT NULL DEFAULT 'OFFICIAL',
    "createdBy" TEXT,
    "visibility" "public"."McpServerVisibility" NOT NULL DEFAULT 'PRIVATE',
    "organizationId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mcpServerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPersonal" BOOLEAN NOT NULL DEFAULT true,
    "maxMembers" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationInvitation" (
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
CREATE TABLE "public"."OrganizationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationRole" (
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
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resourceType" "public"."ResourceType" NOT NULL,
    "action" "public"."PermissionAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResourceAccessControl" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "resourceType" "public"."ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "memberId" TEXT,
    "groupId" TEXT,
    "allowedActions" "public"."PermissionAction"[],
    "deniedActions" "public"."PermissionAction"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAccessControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserMcpServerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "envVars" TEXT NOT NULL,
    "oauthConnection" TEXT,
    "mcpServerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMcpServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserToolGroupTool" (
    "userMcpServerConfigId" TEXT NOT NULL,
    "toolGroupId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToolGroupTool_pkey" PRIMARY KEY ("toolGroupId","userMcpServerConfigId","toolId")
);

-- CreateTable
CREATE TABLE "public"."UserToolGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserToolGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserMcpServerInstanceToolGroup" (
    "mcpServerInstanceId" TEXT NOT NULL,
    "toolGroupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMcpServerInstanceToolGroup_pkey" PRIMARY KEY ("mcpServerInstanceId","toolGroupId")
);

-- CreateTable
CREATE TABLE "public"."UserMcpServerInstance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconPath" TEXT,
    "serverStatus" "public"."ServerStatus" NOT NULL,
    "serverType" "public"."ServerType" NOT NULL,
    "toolGroupId" TEXT NOT NULL,
    "authType" "public"."AuthType" NOT NULL DEFAULT 'API_KEY',
    "organizationId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserMcpServerInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpServerRequestLog" (
    "id" TEXT NOT NULL,
    "mcpServerInstanceId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "transportType" "public"."TransportType" NOT NULL,
    "method" TEXT NOT NULL,
    "responseStatus" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "inputBytes" INTEGER,
    "outputBytes" INTEGER,
    "organizationId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpServerRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpServerRequestData" (
    "id" TEXT NOT NULL,
    "requestLogId" TEXT NOT NULL,
    "inputDataCompressed" BYTEA NOT NULL,
    "outputDataCompressed" BYTEA NOT NULL,
    "originalInputSize" INTEGER NOT NULL,
    "originalOutputSize" INTEGER NOT NULL,
    "compressedInputSize" INTEGER NOT NULL,
    "compressedOutputSize" INTEGER NOT NULL,
    "compressionRatio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpServerRequestData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."waiting_list" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "useCase" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiting_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_OrganizationMemberToOrganizationRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationMemberToOrganizationRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_OrganizationGroupToOrganizationMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationGroupToOrganizationMember_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_OrganizationGroupToOrganizationRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationGroupToOrganizationRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpApiKey_apiKey_key" ON "public"."McpApiKey"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "McpApiKey_apiKeyHash_key" ON "public"."McpApiKey"("apiKeyHash");

-- CreateIndex
CREATE INDEX "McpApiKey_userMcpServerInstanceId_idx" ON "public"."McpApiKey"("userMcpServerInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_mcpServerId_name_key" ON "public"."Tool"("mcpServerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "public"."OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "public"."OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "public"."OrganizationInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_organizationId_email_key" ON "public"."OrganizationInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "OrganizationGroup_organizationId_idx" ON "public"."OrganizationGroup"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationGroup_organizationId_name_key" ON "public"."OrganizationGroup"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRole_organizationId_name_key" ON "public"."OrganizationRole"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_resourceType_action_key" ON "public"."RolePermission"("roleId", "resourceType", "action");

-- CreateIndex
CREATE INDEX "ResourceAccessControl_organizationId_resourceType_resourceI_idx" ON "public"."ResourceAccessControl"("organizationId", "resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAccessControl_organizationId_resourceType_resourceI_key" ON "public"."ResourceAccessControl"("organizationId", "resourceType", "resourceId", "memberId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMcpServerInstance_toolGroupId_key" ON "public"."UserMcpServerInstance"("toolGroupId");

-- CreateIndex
CREATE INDEX "UserMcpServerInstance_deletedAt_idx" ON "public"."UserMcpServerInstance"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "McpServerRequestData_requestLogId_key" ON "public"."McpServerRequestData"("requestLogId");

-- CreateIndex
CREATE UNIQUE INDEX "waiting_list_email_key" ON "public"."waiting_list"("email");

-- CreateIndex
CREATE INDEX "_OrganizationMemberToOrganizationRole_B_index" ON "public"."_OrganizationMemberToOrganizationRole"("B");

-- CreateIndex
CREATE INDEX "_OrganizationGroupToOrganizationMember_B_index" ON "public"."_OrganizationGroupToOrganizationMember"("B");

-- CreateIndex
CREATE INDEX "_OrganizationGroupToOrganizationRole_B_index" ON "public"."_OrganizationGroupToOrganizationRole"("B");

-- AddForeignKey
ALTER TABLE "public"."McpApiKey" ADD CONSTRAINT "McpApiKey_userMcpServerInstanceId_fkey" FOREIGN KEY ("userMcpServerInstanceId") REFERENCES "public"."UserMcpServerInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_defaultOrganizationId_fkey" FOREIGN KEY ("defaultOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Suggestion" ADD CONSTRAINT "Suggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Suggestion" ADD CONSTRAINT "Suggestion_documentId_documentCreatedAt_fkey" FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "public"."Document"("id", "createdAt") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stream" ADD CONSTRAINT "Stream_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServer" ADD CONSTRAINT "McpServer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServer" ADD CONSTRAINT "McpServer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tool" ADD CONSTRAINT "Tool_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "public"."McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Organization" ADD CONSTRAINT "Organization_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationGroup" ADD CONSTRAINT "OrganizationGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationRole" ADD CONSTRAINT "OrganizationRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResourceAccessControl" ADD CONSTRAINT "ResourceAccessControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResourceAccessControl" ADD CONSTRAINT "ResourceAccessControl_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResourceAccessControl" ADD CONSTRAINT "ResourceAccessControl_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerConfig" ADD CONSTRAINT "UserMcpServerConfig_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "public"."McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerConfig" ADD CONSTRAINT "UserMcpServerConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserToolGroupTool" ADD CONSTRAINT "UserToolGroupTool_userMcpServerConfigId_fkey" FOREIGN KEY ("userMcpServerConfigId") REFERENCES "public"."UserMcpServerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserToolGroupTool" ADD CONSTRAINT "UserToolGroupTool_toolGroupId_fkey" FOREIGN KEY ("toolGroupId") REFERENCES "public"."UserToolGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserToolGroupTool" ADD CONSTRAINT "UserToolGroupTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserToolGroup" ADD CONSTRAINT "UserToolGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerInstanceToolGroup" ADD CONSTRAINT "UserMcpServerInstanceToolGroup_mcpServerInstanceId_fkey" FOREIGN KEY ("mcpServerInstanceId") REFERENCES "public"."UserMcpServerInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerInstanceToolGroup" ADD CONSTRAINT "UserMcpServerInstanceToolGroup_toolGroupId_fkey" FOREIGN KEY ("toolGroupId") REFERENCES "public"."UserToolGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerInstance" ADD CONSTRAINT "UserMcpServerInstance_toolGroupId_fkey" FOREIGN KEY ("toolGroupId") REFERENCES "public"."UserToolGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerInstance" ADD CONSTRAINT "UserMcpServerInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_mcpServerInstanceId_fkey" FOREIGN KEY ("mcpServerInstanceId") REFERENCES "public"."UserMcpServerInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServerRequestData" ADD CONSTRAINT "McpServerRequestData_requestLogId_fkey" FOREIGN KEY ("requestLogId") REFERENCES "public"."McpServerRequestLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrganizationMemberToOrganizationRole" ADD CONSTRAINT "_OrganizationMemberToOrganizationRole_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrganizationMemberToOrganizationRole" ADD CONSTRAINT "_OrganizationMemberToOrganizationRole_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrganizationGroupToOrganizationMember" ADD CONSTRAINT "_OrganizationGroupToOrganizationMember_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrganizationGroupToOrganizationMember" ADD CONSTRAINT "_OrganizationGroupToOrganizationMember_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrganizationGroupToOrganizationRole" ADD CONSTRAINT "_OrganizationGroupToOrganizationRole_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrganizationGroupToOrganizationRole" ADD CONSTRAINT "_OrganizationGroupToOrganizationRole_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

