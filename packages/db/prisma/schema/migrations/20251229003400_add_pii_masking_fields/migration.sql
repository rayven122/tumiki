-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "piiMaskingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "McpServerRequestLog" ADD COLUMN     "piiDetectedInfoTypes" TEXT[],
ADD COLUMN     "piiDetectedRequestCount" INTEGER,
ADD COLUMN     "piiDetectedResponseCount" INTEGER,
ADD COLUMN     "piiDetectionDetailsRequest" JSONB,
ADD COLUMN     "piiDetectionDetailsResponse" JSONB,
ADD COLUMN     "piiMaskingEnabled" BOOLEAN NOT NULL DEFAULT false;
