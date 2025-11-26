-- AlterEnum
ALTER TYPE "AuthType" ADD VALUE IF NOT EXISTS 'API_KEY';
ALTER TYPE "AuthType" ADD VALUE IF NOT EXISTS 'OAUTH2';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "defaultOrganizationSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultOrganizationSlug_fkey" FOREIGN KEY ("defaultOrganizationSlug") REFERENCES "Organization"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
