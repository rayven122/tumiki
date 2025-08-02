-- CreateTable
CREATE TABLE "public"."McpSecurityScan" (
    "id" TEXT NOT NULL,
    "mcpServerInstanceId" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL,
    "riskLevel" TEXT,
    "scanResult" JSONB NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpSecurityScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpSecurityIssue" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "toolName" TEXT,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpSecurityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpSecurityScan_mcpServerInstanceId_createdAt_idx" ON "public"."McpSecurityScan"("mcpServerInstanceId", "createdAt");

-- CreateIndex
CREATE INDEX "McpSecurityScan_riskLevel_idx" ON "public"."McpSecurityScan"("riskLevel");

-- CreateIndex
CREATE INDEX "McpSecurityIssue_scanId_idx" ON "public"."McpSecurityIssue"("scanId");

-- CreateIndex
CREATE INDEX "McpSecurityIssue_severity_idx" ON "public"."McpSecurityIssue"("severity");

-- AddForeignKey
ALTER TABLE "public"."McpSecurityScan" ADD CONSTRAINT "McpSecurityScan_mcpServerInstanceId_fkey" FOREIGN KEY ("mcpServerInstanceId") REFERENCES "public"."UserMcpServerInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."McpSecurityIssue" ADD CONSTRAINT "McpSecurityIssue_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "public"."McpSecurityScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
