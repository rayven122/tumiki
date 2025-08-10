-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "defaultOrganizationId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_defaultOrganizationId_fkey" FOREIGN KEY ("defaultOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
