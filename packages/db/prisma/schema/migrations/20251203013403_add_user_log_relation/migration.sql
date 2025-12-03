-- AlterTable
ALTER TABLE "public"."McpServerRequestLog" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
