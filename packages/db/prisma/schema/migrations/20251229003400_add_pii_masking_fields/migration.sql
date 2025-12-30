-- CreateEnum
CREATE TYPE "PiiMaskingMode" AS ENUM ('DISABLED', 'REQUEST', 'RESPONSE', 'BOTH');

-- AlterTable
ALTER TABLE "McpServer"
ADD COLUMN     "piiInfoTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "piiMaskingMode" "PiiMaskingMode" NOT NULL DEFAULT 'DISABLED';

-- AlterTable
ALTER TABLE "McpServerRequestLog"
ADD COLUMN     "piiDetectedInfoTypes" TEXT[],
ADD COLUMN     "piiDetectedRequestCount" INTEGER,
ADD COLUMN     "piiDetectedResponseCount" INTEGER,
ADD COLUMN     "piiMaskingMode" "PiiMaskingMode" NOT NULL DEFAULT 'DISABLED';
