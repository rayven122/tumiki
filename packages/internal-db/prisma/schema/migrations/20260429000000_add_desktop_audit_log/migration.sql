-- CreateTable
CREATE TABLE "DesktopAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "toolName" VARCHAR(255) NOT NULL,
    "method" VARCHAR(64) NOT NULL,
    "httpStatus" SMALLINT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "inputBytes" INTEGER NOT NULL,
    "outputBytes" INTEGER NOT NULL,
    "errorCode" INTEGER,
    "errorSummary" VARCHAR(500),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesktopAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesktopAuditLog_userId_occurredAt_idx" ON "DesktopAuditLog"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "DesktopAuditLog_mcpServerId_occurredAt_idx" ON "DesktopAuditLog"("mcpServerId", "occurredAt");

-- AddForeignKey
ALTER TABLE "DesktopAuditLog" ADD CONSTRAINT "DesktopAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
