-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('NONE', 'API_KEY', 'OAUTH');

-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "authType" "AuthType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "oauthProvider" TEXT,
ADD COLUMN     "oauthScopes" TEXT[];

-- AlterTable
ALTER TABLE "UserMcpServerConfig" ADD COLUMN     "oauthConnection" TEXT,
ADD COLUMN     "oauthScopes" TEXT[];
