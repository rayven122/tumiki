/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,userId]` on the table `OrganizationMember` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "McpServer_name_key";

-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
