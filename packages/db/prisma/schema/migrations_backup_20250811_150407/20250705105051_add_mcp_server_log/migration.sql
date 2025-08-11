-- CreateTable
CREATE TABLE "McpServerRequestLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcpServerInstanceId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "transportType" "TransportType" NOT NULL,
    "method" TEXT NOT NULL,
    "responseStatus" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "inputBytes" INTEGER,
    "outputBytes" INTEGER,
    "organizationId" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpServerRequestLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_mcpServerInstanceId_fkey" FOREIGN KEY ("mcpServerInstanceId") REFERENCES "UserMcpServerInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServerRequestLog" ADD CONSTRAINT "McpServerRequestLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
