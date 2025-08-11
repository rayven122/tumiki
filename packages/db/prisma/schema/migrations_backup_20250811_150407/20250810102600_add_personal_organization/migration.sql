-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxMembers" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "defaultOrganizationId" TEXT;
