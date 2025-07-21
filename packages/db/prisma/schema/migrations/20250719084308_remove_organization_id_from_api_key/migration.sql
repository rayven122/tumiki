/*
  Warnings:

  - You are about to drop the column `organizationId` on the `McpApiKey` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "McpApiKey" DROP CONSTRAINT "McpApiKey_organizationId_fkey";

-- AlterTable
ALTER TABLE "McpApiKey" DROP COLUMN "organizationId";
