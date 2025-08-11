-- DropIndex
DROP INDEX "UserMcpServerConfig_userId_mcpServerId_name_key";

-- AlterTable
ALTER TABLE "UserMcpServerInstance" ADD COLUMN     "deletedAt" TIMESTAMP(3);
