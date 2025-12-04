/*
  Warnings:

  - You are about to drop the column `gcsObjectKey` on the `McpServerRequestLog` table. All the data in the column will be lost.
  - You are about to drop the column `gcsUploadedAt` on the `McpServerRequestLog` table. All the data in the column will be lost.
  - You are about to alter the column `toolName` on the `McpServerRequestLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `method` on the `McpServerRequestLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userAgent` on the `McpServerRequestLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(512)`.
  - Added the required column `userId` to the `McpServerRequestLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `httpStatus` on the `McpServerRequestLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."McpServerRequestLog" DROP CONSTRAINT "McpServerRequestLog_mcpApiKeyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServerRequestLog" DROP CONSTRAINT "McpServerRequestLog_mcpServerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."McpServerRequestLog" DROP CONSTRAINT "McpServerRequestLog_organizationId_fkey";

-- AlterTable
ALTER TABLE "public"."McpServerRequestLog" DROP COLUMN "gcsObjectKey",
DROP COLUMN "gcsUploadedAt",
ADD COLUMN     "errorCode" INTEGER,
ADD COLUMN     "errorSummary" VARCHAR(500),
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "toolName" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "method" SET DATA TYPE VARCHAR(64),
DROP COLUMN "httpStatus",
ADD COLUMN     "httpStatus" SMALLINT NOT NULL,
ALTER COLUMN "userAgent" SET DATA TYPE VARCHAR(512);

-- CreateIndex
CREATE INDEX "McpServerRequestLog_mcpServerId_createdAt_idx" ON "public"."McpServerRequestLog"("mcpServerId", "createdAt");

-- CreateIndex
CREATE INDEX "McpServerRequestLog_organizationId_createdAt_idx" ON "public"."McpServerRequestLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "McpServerRequestLog_userId_createdAt_idx" ON "public"."McpServerRequestLog"("userId", "createdAt");
