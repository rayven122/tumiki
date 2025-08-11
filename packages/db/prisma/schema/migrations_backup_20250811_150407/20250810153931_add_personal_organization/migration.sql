/*
  Warnings:

  - The values [BOTH] on the enum `AuthType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userId` on the `McpApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `McpServerRequestLog` table. All the data in the column will be lost.
  - You are about to drop the column `defaultOrganizationId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `hasCompletedOnboarding` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `oauthScopes` on the `UserMcpServerConfig` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserMcpServerConfig` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserMcpServerInstance` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserToolGroup` table. All the data in the column will be lost.
  - You are about to drop the `_ToolToUserMcpServerConfig` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `organizationId` on table `McpServerRequestLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `UserMcpServerConfig` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `UserMcpServerInstance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `UserToolGroup` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuthType_new" AS ENUM ('NONE', 'API_KEY', 'OAUTH');
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" DROP DEFAULT;
ALTER TABLE "public"."UserMcpServerInstance" ALTER COLUMN "authType" DROP DEFAULT;
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" TYPE "public"."AuthType_new" USING ("authType"::text::"public"."AuthType_new");
ALTER TABLE "public"."UserMcpServerInstance" ALTER COLUMN "authType" TYPE "public"."AuthType_new" USING ("authType"::text::"public"."AuthType_new");
ALTER TYPE "public"."AuthType" RENAME TO "AuthType_old";
ALTER TYPE "public"."AuthType_new" RENAME TO "AuthType";
DROP TYPE "public"."AuthType_old";
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" SET DEFAULT 'NONE';
ALTER TABLE "public"."UserMcpServerInstance" ALTER COLUMN "authType" SET DEFAULT 'API_KEY';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."McpApiKey" DROP CONSTRAINT "McpApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServerRequestLog" DROP CONSTRAINT "McpServerRequestLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServerRequestLog" DROP CONSTRAINT "McpServerRequestLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerConfig" DROP CONSTRAINT "UserMcpServerConfig_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerConfig" DROP CONSTRAINT "UserMcpServerConfig_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerInstance" DROP CONSTRAINT "UserMcpServerInstance_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMcpServerInstance" DROP CONSTRAINT "UserMcpServerInstance_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserToolGroup" DROP CONSTRAINT "UserToolGroup_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserToolGroup" DROP CONSTRAINT "UserToolGroup_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ToolToUserMcpServerConfig" DROP CONSTRAINT "_ToolToUserMcpServerConfig_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ToolToUserMcpServerConfig" DROP CONSTRAINT "_ToolToUserMcpServerConfig_B_fkey";

-- DropIndex
DROP INDEX "public"."McpApiKey_userId_idx";

-- AlterTable
ALTER TABLE "public"."McpApiKey" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."McpServerRequestLog" DROP COLUMN "userId",
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "defaultOrganizationId",
DROP COLUMN "hasCompletedOnboarding";

-- AlterTable
ALTER TABLE "public"."UserMcpServerConfig" DROP COLUMN "oauthScopes",
DROP COLUMN "userId",
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserMcpServerInstance" DROP COLUMN "userId",
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserToolGroup" DROP COLUMN "userId",
ALTER COLUMN "organizationId" SET NOT NULL;

-- DropTable
DROP TABLE "public"."_ToolToUserMcpServerConfig";

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerConfig" ADD CONSTRAINT "UserMcpServerConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserToolGroup" ADD CONSTRAINT "UserToolGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMcpServerInstance" ADD CONSTRAINT "UserMcpServerInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
