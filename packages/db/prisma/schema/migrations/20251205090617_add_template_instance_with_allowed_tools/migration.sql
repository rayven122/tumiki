/*
  Warnings:

  - You are about to drop the `_McpServerToMcpServerTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_McpServerToMcpTool` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[mcpServerTemplateInstanceId,userId,organizationId]` on the table `McpConfig` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,mcpServerTemplateInstanceId]` on the table `McpOAuthToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX IF EXISTS "McpConfig_mcpServerId_userId_organizationId_key";

-- DropIndex
DROP INDEX IF EXISTS "McpOAuthToken_userId_mcpServerId_key";

-- DropForeignKey
ALTER TABLE "McpConfig" DROP CONSTRAINT IF EXISTS "McpConfig_mcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "McpOAuthToken" DROP CONSTRAINT IF EXISTS "McpOAuthToken_mcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "_McpServerToMcpServerTemplate" DROP CONSTRAINT "_McpServerToMcpServerTemplate_A_fkey";

-- DropForeignKey
ALTER TABLE "_McpServerToMcpServerTemplate" DROP CONSTRAINT "_McpServerToMcpServerTemplate_B_fkey";

-- DropForeignKey
ALTER TABLE "_McpServerToMcpTool" DROP CONSTRAINT "_McpServerToMcpTool_A_fkey";

-- DropForeignKey
ALTER TABLE "_McpServerToMcpTool" DROP CONSTRAINT "_McpServerToMcpTool_B_fkey";

-- AlterTable
ALTER TABLE "McpConfig" DROP COLUMN IF EXISTS "mcpServerId";
ALTER TABLE "McpConfig" ADD COLUMN IF NOT EXISTS "mcpServerTemplateInstanceId" TEXT;

-- AlterTable
ALTER TABLE "McpOAuthToken" DROP COLUMN IF EXISTS "mcpServerId";
ALTER TABLE "McpOAuthToken" ADD COLUMN IF NOT EXISTS "mcpServerTemplateInstanceId" TEXT;

-- DropTable
DROP TABLE "_McpServerToMcpServerTemplate";

-- DropTable
DROP TABLE "_McpServerToMcpTool";

-- CreateTable
CREATE TABLE "McpServerTemplateInstance" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "mcpServerTemplateId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServerTemplateInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_McpServerTemplateInstanceToMcpTool" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_McpServerTemplateInstanceToMcpTool_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpServerTemplateInstance_mcpServerId_normalizedName_key" ON "McpServerTemplateInstance"("mcpServerId", "normalizedName");

-- CreateIndex
CREATE INDEX "_McpServerTemplateInstanceToMcpTool_B_index" ON "_McpServerTemplateInstanceToMcpTool"("B");

-- AddForeignKey
ALTER TABLE "McpServerTemplateInstance" ADD CONSTRAINT "McpServerTemplateInstance_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServerTemplateInstance" ADD CONSTRAINT "McpServerTemplateInstance_mcpServerTemplateId_fkey" FOREIGN KEY ("mcpServerTemplateId") REFERENCES "McpServerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_McpServerTemplateInstanceToMcpTool" ADD CONSTRAINT "_McpServerTemplateInstanceToMcpTool_A_fkey" FOREIGN KEY ("A") REFERENCES "McpServerTemplateInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_McpServerTemplateInstanceToMcpTool" ADD CONSTRAINT "_McpServerTemplateInstanceToMcpTool_B_fkey" FOREIGN KEY ("B") REFERENCES "McpTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpConfig" ADD CONSTRAINT "McpConfig_mcpServerTemplateInstanceId_fkey" FOREIGN KEY ("mcpServerTemplateInstanceId") REFERENCES "McpServerTemplateInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_mcpServerTemplateInstanceId_fkey" FOREIGN KEY ("mcpServerTemplateInstanceId") REFERENCES "McpServerTemplateInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "McpConfig_mcpServerTemplateInstanceId_userId_organizationId_key" ON "McpConfig"("mcpServerTemplateInstanceId", "userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthToken_userId_mcpServerTemplateInstanceId_key" ON "McpOAuthToken"("userId", "mcpServerTemplateInstanceId");

-- 既存のMcpServerTemplateInstanceレコードにnormalizedNameを設定
-- テンプレートのnormalizedNameをコピー
UPDATE "McpServerTemplateInstance"
SET "normalizedName" = (
  SELECT "normalizedName"
  FROM "McpServerTemplate"
  WHERE "McpServerTemplate"."id" = "McpServerTemplateInstance"."mcpServerTemplateId"
)
WHERE "normalizedName" IS NULL OR "normalizedName" = '';

-- createdAtとupdatedAtを設定（既存レコード用）
UPDATE "McpServerTemplateInstance"
SET
  "createdAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "createdAt" IS NULL;
