-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "toonConversionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "McpServerRequestLog" ADD COLUMN     "toonConversionEnabled" BOOLEAN,
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "outputTokens" INTEGER;
