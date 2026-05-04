-- Add allowlist-style MCP tool permissions for groups and user overrides.

CREATE TABLE "GroupMcpToolPermission" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "mcpServerId" TEXT NOT NULL,
  "mcpConnectionId" TEXT NOT NULL,
  "mcpToolId" TEXT NOT NULL,
  "canUse" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GroupMcpToolPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserMcpToolPermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mcpServerId" TEXT NOT NULL,
  "mcpConnectionId" TEXT NOT NULL,
  "mcpToolId" TEXT NOT NULL,
  "canUse" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserMcpToolPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupMcpToolPermission_groupId_mcpToolId_key" ON "GroupMcpToolPermission"("groupId", "mcpToolId");
CREATE INDEX "GroupMcpToolPermission_groupId_mcpServerId_idx" ON "GroupMcpToolPermission"("groupId", "mcpServerId");
CREATE UNIQUE INDEX "UserMcpToolPermission_userId_mcpToolId_key" ON "UserMcpToolPermission"("userId", "mcpToolId");
CREATE INDEX "UserMcpToolPermission_userId_mcpServerId_idx" ON "UserMcpToolPermission"("userId", "mcpServerId");

ALTER TABLE "GroupMcpToolPermission" ADD CONSTRAINT "GroupMcpToolPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMcpToolPermission" ADD CONSTRAINT "UserMcpToolPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
