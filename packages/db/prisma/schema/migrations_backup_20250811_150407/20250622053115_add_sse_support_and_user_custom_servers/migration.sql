-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('STDIO', 'SSE');

-- CreateEnum
CREATE TYPE "McpServerVisibility" AS ENUM ('PRIVATE', 'ORGANIZATION', 'PUBLIC');

-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "serverType" "ServerType" NOT NULL DEFAULT 'OFFICIAL',
ADD COLUMN     "transportType" "TransportType" NOT NULL DEFAULT 'STDIO',
ADD COLUMN     "url" TEXT,
ADD COLUMN     "visibility" "McpServerVisibility" NOT NULL DEFAULT 'PRIVATE',
ALTER COLUMN "command" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
