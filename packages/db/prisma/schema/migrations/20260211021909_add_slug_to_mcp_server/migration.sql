/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,slug]` on the table `McpServer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `McpServer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add slug column with default value first
ALTER TABLE "McpServer" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Update existing records: Generate slug from name (lowercase, replace spaces with hyphens, remove invalid chars)
UPDATE "McpServer"
SET "slug" = LOWER(REGEXP_REPLACE(REPLACE("name", ' ', '-'), '[^a-z0-9-]', '', 'g'))
WHERE "slug" = '';

-- Handle empty or too short slugs (e.g., Japanese names): Use ID prefix as slug
UPDATE "McpServer"
SET "slug" = 'mcp-' || SUBSTRING("id", 1, 8)
WHERE "slug" = '' OR LENGTH("slug") < 3;

-- Handle duplicates within same organization: Append short ID suffix
UPDATE "McpServer" m1
SET "slug" = m1."slug" || '-' || SUBSTRING(m1."id", 1, 6)
WHERE EXISTS (
  SELECT 1 FROM "McpServer" m2
  WHERE m1."organizationId" = m2."organizationId"
  AND m1."slug" = m2."slug"
  AND m1."id" != m2."id"
);

-- Remove default value constraint
ALTER TABLE "McpServer" ALTER COLUMN "slug" DROP DEFAULT;

-- AlterTable
ALTER TABLE "McpServerRequestLog" ADD COLUMN "toolCallId" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "McpServer_organizationId_slug_key" ON "McpServer"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "McpServerRequestLog_toolCallId_idx" ON "McpServerRequestLog"("toolCallId");
