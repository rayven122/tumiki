-- Align server-side MCP catalog storage with the Desktop DB naming model.

ALTER TYPE "TransportType" ADD VALUE IF NOT EXISTS 'STREAMABLE_HTTP';
ALTER TYPE "AuthType" ADD VALUE IF NOT EXISTS 'BEARER';

DO $$
BEGIN
  CREATE TYPE "McpToolReviewStatus" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'CHANGED_REQUIRES_REVIEW',
    'REJECTED',
    'MISSING'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "McpCatalog" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "iconPath" TEXT,
  "transportType" "TransportType" NOT NULL DEFAULT 'STDIO',
  "command" TEXT,
  "args" TEXT[],
  "url" TEXT,
  "credentialKeys" TEXT[],
  "authType" "AuthType" NOT NULL DEFAULT 'NONE',
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "McpCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "McpConnection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "mcpServerId" TEXT NOT NULL,
  "catalogId" TEXT,
  "transportType" "TransportType" NOT NULL DEFAULT 'STDIO',
  "command" TEXT,
  "args" TEXT[],
  "url" TEXT,
  "credentialKeys" TEXT[],
  "credentials" TEXT NOT NULL DEFAULT '{}',
  "authType" "AuthType" NOT NULL DEFAULT 'NONE',
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "McpConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthClient" (
  "id" TEXT NOT NULL,
  "serverUrl" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientSecret" TEXT,
  "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
  "authServerMetadata" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "McpTool" ALTER COLUMN "mcpServerTemplateId" DROP NOT NULL;
ALTER TABLE "McpTool" ADD COLUMN "mcpConnectionId" TEXT;
ALTER TABLE "McpTool" ADD COLUMN "isAllowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "McpTool" ADD COLUMN "reviewStatus" "McpToolReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE "McpTool" ADD COLUMN "discoveredAt" TIMESTAMP(3);
ALTER TABLE "McpTool" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "McpTool" ADD COLUMN "schemaHash" TEXT;

CREATE UNIQUE INDEX "McpCatalog_organizationId_slug_key" ON "McpCatalog"("organizationId", "slug");
CREATE UNIQUE INDEX "McpConnection_mcpServerId_slug_key" ON "McpConnection"("mcpServerId", "slug");
CREATE UNIQUE INDEX "McpTool_mcpConnectionId_name_key" ON "McpTool"("mcpConnectionId", "name");
CREATE UNIQUE INDEX "OAuthClient_organizationId_serverUrl_key" ON "OAuthClient"("organizationId", "serverUrl");

ALTER TABLE "McpCatalog" ADD CONSTRAINT "McpCatalog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "McpCatalog" ADD CONSTRAINT "McpCatalog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "McpConnection" ADD CONSTRAINT "McpConnection_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "McpConnection" ADD CONSTRAINT "McpConnection_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "McpTool" ADD CONSTRAINT "McpTool_mcpConnectionId_fkey" FOREIGN KEY ("mcpConnectionId") REFERENCES "McpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
