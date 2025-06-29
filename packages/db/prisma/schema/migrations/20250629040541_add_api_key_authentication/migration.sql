-- CreateTable
CREATE TABLE "McpApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "userMcpServerInstanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpApiKey_apiKey_key" ON "McpApiKey"("apiKey");

-- CreateIndex
CREATE INDEX "McpApiKey_userMcpServerInstanceId_idx" ON "McpApiKey"("userMcpServerInstanceId");

-- CreateIndex
CREATE INDEX "McpApiKey_userId_idx" ON "McpApiKey"("userId");

-- AddForeignKey
ALTER TABLE "McpApiKey" ADD CONSTRAINT "McpApiKey_userMcpServerInstanceId_fkey" FOREIGN KEY ("userMcpServerInstanceId") REFERENCES "UserMcpServerInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpApiKey" ADD CONSTRAINT "McpApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpApiKey" ADD CONSTRAINT "McpApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
