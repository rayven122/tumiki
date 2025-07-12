-- DropForeignKey
ALTER TABLE "McpServerRequestLog" DROP CONSTRAINT "McpServerRequestLog_userId_fkey";

-- AlterTable
ALTER TABLE "McpServerRequestLog" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "McpServerRequestData" (
    "id" TEXT NOT NULL,
    "requestLogId" TEXT NOT NULL,
    "inputDataCompressed" BYTEA NOT NULL,
    "outputDataCompressed" BYTEA NOT NULL,
    "originalInputSize" INTEGER NOT NULL,
    "originalOutputSize" INTEGER NOT NULL,
    "compressedInputSize" INTEGER NOT NULL,
    "compressedOutputSize" INTEGER NOT NULL,
    "compressionRatio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpServerRequestData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpServerRequestData_requestLogId_key" ON "McpServerRequestData"("requestLogId");

-- AddForeignKey
ALTER TABLE "McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServerRequestData" ADD CONSTRAINT "McpServerRequestData_requestLogId_fkey" FOREIGN KEY ("requestLogId") REFERENCES "McpServerRequestLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
