/*
  Warnings:

  - The values [CLOUD_RUN_IAM] on the enum `AuthType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userMcpServerInstanceId` on the `McpApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `args` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `command` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `envVars` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `oauthProvider` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `oauthScopes` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `transportType` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `errorCode` on the `McpServerRequestLog` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `McpServerRequestLog` table. All the data in the column will be lost.
  - You are about to drop the column `mcpServerInstanceId` on the `McpServerRequestLog` table. All the data in the column will be lost.
  - You are about to drop the column `responseStatus` on the `McpServerRequestLog` table. All the data in the column will be lost.
  - You are about to drop the `McpServerRequestData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OAuthClient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OAuthSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OAuthToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserMcpServerConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserMcpServerInstance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserMcpServerInstanceToolGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserToolGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserToolGroupTool` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `mcpServerId` to the `McpApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serverStatus` to the `McpServer` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `McpServer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `McpServer` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `httpStatus` to the `McpServerRequestLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mcpServerId` to the `McpServerRequestLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `inputBytes` on table `McpServerRequestLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `outputBytes` on table `McpServerRequestLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."McpApiKey" DROP CONSTRAINT "McpApiKey_userMcpServerInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServer" DROP CONSTRAINT "McpServer_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServer" DROP CONSTRAINT "McpServer_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServerRequestData" DROP CONSTRAINT "McpServerRequestData_requestLogId_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServerRequestLog" DROP CONSTRAINT "McpServerRequestLog_mcpServerInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OAuthClient" DROP CONSTRAINT "OAuthClient_mcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OAuthSession" DROP CONSTRAINT "OAuthSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OAuthToken" DROP CONSTRAINT "OAuthToken_oauthClientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OAuthToken" DROP CONSTRAINT "OAuthToken_userMcpConfigId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Tool" DROP CONSTRAINT "Tool_mcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerConfig" DROP CONSTRAINT "UserMcpServerConfig_mcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerConfig" DROP CONSTRAINT "UserMcpServerConfig_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerInstance" DROP CONSTRAINT "UserMcpServerInstance_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerInstance" DROP CONSTRAINT "UserMcpServerInstance_toolGroupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerInstanceToolGroup" DROP CONSTRAINT "UserMcpServerInstanceToolGroup_mcpServerInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerInstanceToolGroup" DROP CONSTRAINT "UserMcpServerInstanceToolGroup_toolGroupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserToolGroup" DROP CONSTRAINT "UserToolGroup_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserToolGroupTool" DROP CONSTRAINT "UserToolGroupTool_toolGroupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserToolGroupTool" DROP CONSTRAINT "UserToolGroupTool_toolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserToolGroupTool" DROP CONSTRAINT "UserToolGroupTool_userMcpServerConfigId_fkey";

-- DropIndex
DROP INDEX "public"."Account_userId_idx";

-- DropIndex
DROP INDEX "public"."McpApiKey_userId_idx";

-- DropIndex
DROP INDEX "public"."McpApiKey_userMcpServerInstanceId_idx";

-- DropIndex
DROP INDEX "public"."McpServer_organizationId_idx";

-- DropIndex
DROP INDEX "public"."McpServerRequestLog_organizationId_idx";

-- DropIndex
DROP INDEX "public"."OrganizationGroup_organizationId_idx";

-- DropIndex
DROP INDEX "public"."Session_userId_idx";

-- AlterTable
ALTER TABLE "public"."McpApiKey" DROP COLUMN "userMcpServerInstanceId",
ADD COLUMN     "mcpServerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."McpServer" DROP COLUMN "args",
DROP COLUMN "command",
DROP COLUMN "createdBy",
DROP COLUMN "envVars",
DROP COLUMN "isPublic",
DROP COLUMN "oauthProvider",
DROP COLUMN "oauthScopes",
DROP COLUMN "tags",
DROP COLUMN "transportType",
DROP COLUMN "url",
DROP COLUMN "visibility",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "serverStatus" "public"."ServerStatus" NOT NULL,
ALTER COLUMN "serverType" DROP DEFAULT,
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."McpServerRequestLog" DROP COLUMN "errorCode",
DROP COLUMN "errorMessage",
DROP COLUMN "mcpServerInstanceId",
DROP COLUMN "responseStatus",
ADD COLUMN     "gcsObjectKey" TEXT,
ADD COLUMN     "gcsUploadedAt" TIMESTAMP(3),
ADD COLUMN     "httpStatus" TEXT NOT NULL,
ADD COLUMN     "mcpServerId" TEXT NOT NULL,
ALTER COLUMN "inputBytes" SET NOT NULL,
ALTER COLUMN "outputBytes" SET NOT NULL;

-- DropTable
DROP TABLE "public"."McpServerRequestData";

-- DropTable
DROP TABLE "public"."OAuthClient";

-- DropTable
DROP TABLE "public"."OAuthSession";

-- DropTable
DROP TABLE "public"."OAuthToken";

-- DropTable
DROP TABLE "public"."Tool";

-- DropTable
DROP TABLE "public"."UserMcpServerConfig";

-- DropTable
DROP TABLE "public"."UserMcpServerInstance";

-- DropTable
DROP TABLE "public"."UserMcpServerInstanceToolGroup";

-- DropTable
DROP TABLE "public"."UserToolGroup";

-- DropTable
DROP TABLE "public"."UserToolGroupTool";

-- CreateTable
CREATE TABLE "public"."McpServerTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "iconPath" TEXT,
    "transportType" "public"."TransportType" NOT NULL DEFAULT 'STDIO',
    "command" TEXT,
    "args" TEXT[],
    "url" TEXT,
    "envVarKeys" TEXT[],
    "authType" "public"."AuthType" NOT NULL DEFAULT 'NONE',
    "oauthProvider" VARCHAR(50),
    "oauthScopes" TEXT[],
    "useCloudRunIam" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "visibility" "public"."McpServerVisibility" NOT NULL DEFAULT 'PRIVATE',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpTool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "mcpServerTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpConfig" (
    "id" TEXT NOT NULL,
    "envVars" TEXT NOT NULL,
    "mcpServerTemplateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpOAuthClient" (
    "id" TEXT NOT NULL,
    "mcpServerTemplateId" TEXT,
    "organizationId" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "registrationAccessToken" TEXT,
    "registrationClientUri" TEXT,
    "authorizationServerUrl" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpOAuthToken" (
    "id" TEXT NOT NULL,
    "oauthClientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "tokenPurpose" "public"."TokenPurpose" NOT NULL DEFAULT 'BACKEND_MCP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_McpServerToMcpServerTemplate" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_McpServerToMcpServerTemplate_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_McpServerToMcpTool" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_McpServerToMcpTool_AB_pkey" PRIMARY KEY ("A","B")
);

-- AlterEnum: AuthType から CLOUD_RUN_IAM を削除
-- 注意: McpServerTemplateテーブル作成後に実行

-- ステップ1: 新しいEnum型を作成
CREATE TYPE "public"."AuthType_new" AS ENUM ('NONE', 'API_KEY', 'OAUTH');

-- ステップ2: authTypeカラムのデフォルト値を削除
ALTER TABLE "public"."McpServerTemplate" ALTER COLUMN "authType" DROP DEFAULT;
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" DROP DEFAULT;

-- ステップ3: 各テーブルのauthTypeカラムを新しい型に変換
ALTER TABLE "public"."McpServerTemplate" ALTER COLUMN "authType" TYPE "public"."AuthType_new" USING ("authType"::text::"public"."AuthType_new");
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" TYPE "public"."AuthType_new" USING ("authType"::text::"public"."AuthType_new");

-- ステップ4: Enum型の入れ替え
ALTER TYPE "public"."AuthType" RENAME TO "AuthType_old";
ALTER TYPE "public"."AuthType_new" RENAME TO "AuthType";
DROP TYPE "public"."AuthType_old";

-- ステップ5: デフォルト値を再設定
ALTER TABLE "public"."McpServerTemplate" ALTER COLUMN "authType" SET DEFAULT 'NONE'::"public"."AuthType";
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" SET DEFAULT 'API_KEY'::"public"."AuthType";

-- CreateIndex
CREATE UNIQUE INDEX "McpTool_mcpServerTemplateId_name_key" ON "public"."McpTool"("mcpServerTemplateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "McpConfig_mcpServerTemplateId_organizationId_userId_key" ON "public"."McpConfig"("mcpServerTemplateId", "organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthToken_userId_organizationId_oauthClientId_tokenPurp_key" ON "public"."McpOAuthToken"("userId", "organizationId", "oauthClientId", "tokenPurpose");

-- CreateIndex
CREATE INDEX "_McpServerToMcpServerTemplate_B_index" ON "public"."_McpServerToMcpServerTemplate"("B");

-- CreateIndex
CREATE INDEX "_McpServerToMcpTool_B_index" ON "public"."_McpServerToMcpTool"("B");

-- CreateIndex
CREATE INDEX "McpServer_deletedAt_idx" ON "public"."McpServer"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."McpServerTemplate" ADD CONSTRAINT "McpServerTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServerTemplate" ADD CONSTRAINT "McpServerTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpTool" ADD CONSTRAINT "McpTool_mcpServerTemplateId_fkey" FOREIGN KEY ("mcpServerTemplateId") REFERENCES "public"."McpServerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpConfig" ADD CONSTRAINT "McpConfig_mcpServerTemplateId_fkey" FOREIGN KEY ("mcpServerTemplateId") REFERENCES "public"."McpServerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpConfig" ADD CONSTRAINT "McpConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpConfig" ADD CONSTRAINT "McpConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServer" ADD CONSTRAINT "McpServer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "public"."McpServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpApiKey" ADD CONSTRAINT "McpApiKey_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "public"."McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpOAuthClient" ADD CONSTRAINT "McpOAuthClient_mcpServerTemplateId_fkey" FOREIGN KEY ("mcpServerTemplateId") REFERENCES "public"."McpServerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpOAuthClient" ADD CONSTRAINT "McpOAuthClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_oauthClientId_fkey" FOREIGN KEY ("oauthClientId") REFERENCES "public"."McpOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_McpServerToMcpServerTemplate" ADD CONSTRAINT "_McpServerToMcpServerTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_McpServerToMcpServerTemplate" ADD CONSTRAINT "_McpServerToMcpServerTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."McpServerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_McpServerToMcpTool" ADD CONSTRAINT "_McpServerToMcpTool_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_McpServerToMcpTool" ADD CONSTRAINT "_McpServerToMcpTool_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."McpTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
