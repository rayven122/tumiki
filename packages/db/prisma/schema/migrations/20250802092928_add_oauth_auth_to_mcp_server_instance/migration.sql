-- AlterEnum
ALTER TYPE "public"."AuthType" ADD VALUE 'BOTH';

-- AlterTable
ALTER TABLE "public"."UserMcpServerInstance" ADD COLUMN     "authType" "public"."AuthType" NOT NULL DEFAULT 'API_KEY';