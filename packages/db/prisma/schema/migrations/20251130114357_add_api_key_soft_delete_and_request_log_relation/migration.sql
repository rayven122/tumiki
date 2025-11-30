/*
  Warnings:

  - The values [OAUTH2] on the enum `AuthType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `defaultOrganizationId` on the `User` table. All the data in the column will be lost.
  - Made the column `slug` on table `Organization` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuthType_new" AS ENUM ('NONE', 'API_KEY', 'OAUTH');
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" DROP DEFAULT;
ALTER TABLE "public"."McpServerTemplate" ALTER COLUMN "authType" DROP DEFAULT;
ALTER TABLE "public"."McpServerTemplate" ALTER COLUMN "authType" TYPE "public"."AuthType_new" USING ("authType"::text::"public"."AuthType_new");
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" TYPE "public"."AuthType_new" USING ("authType"::text::"public"."AuthType_new");
ALTER TYPE "public"."AuthType" RENAME TO "AuthType_old";
ALTER TYPE "public"."AuthType_new" RENAME TO "AuthType";
DROP TYPE "public"."AuthType_old";
ALTER TABLE "public"."McpServer" ALTER COLUMN "authType" SET DEFAULT 'API_KEY';
ALTER TABLE "public"."McpServerTemplate" ALTER COLUMN "authType" SET DEFAULT 'NONE';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_defaultOrganizationId_fkey";

-- AlterTable
ALTER TABLE "public"."McpApiKey" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."McpServerRequestLog" ADD COLUMN     "mcpApiKeyId" TEXT;

-- AlterTable
ALTER TABLE "public"."Organization" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "defaultOrganizationId";

-- CreateIndex
CREATE INDEX "McpApiKey_deletedAt_idx" ON "public"."McpApiKey"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_mcpApiKeyId_fkey" FOREIGN KEY ("mcpApiKeyId") REFERENCES "public"."McpApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
