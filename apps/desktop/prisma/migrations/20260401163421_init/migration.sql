-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "idToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mcp_catalog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "iconPath" TEXT,
    "transportType" TEXT NOT NULL DEFAULT 'STDIO',
    "command" TEXT,
    "args" TEXT NOT NULL DEFAULT '[]',
    "url" TEXT,
    "credentialKeys" TEXT NOT NULL DEFAULT '[]',
    "authType" TEXT NOT NULL DEFAULT 'NONE',
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mcp_connection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "transportType" TEXT NOT NULL DEFAULT 'STDIO',
    "command" TEXT,
    "args" TEXT NOT NULL DEFAULT '[]',
    "url" TEXT,
    "credentials" TEXT NOT NULL DEFAULT '{}',
    "authType" TEXT NOT NULL DEFAULT 'NONE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "serverId" INTEGER NOT NULL,
    "catalogId" INTEGER,
    CONSTRAINT "mcp_connection_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "mcp_server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mcp_connection_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "mcp_catalog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mcp_tool" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "inputSchema" TEXT NOT NULL DEFAULT '{}',
    "customName" TEXT,
    "customDescription" TEXT,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "connectionId" INTEGER NOT NULL,
    CONSTRAINT "mcp_tool_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "mcp_connection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mcp_server" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "serverStatus" TEXT NOT NULL DEFAULT 'STOPPED',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "log_sync_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" TEXT NOT NULL,
    "logEntry" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" DATETIME
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "toolName" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "transportType" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "inputBytes" INTEGER NOT NULL DEFAULT 0,
    "outputBytes" INTEGER NOT NULL DEFAULT 0,
    "isSuccess" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" INTEGER,
    "errorSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverId" INTEGER NOT NULL,
    "connectionName" TEXT,
    CONSTRAINT "audit_log_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "mcp_server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_catalog_name_key" ON "mcp_catalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_connection_serverId_slug_key" ON "mcp_connection"("serverId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_tool_connectionId_name_key" ON "mcp_tool"("connectionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_server_slug_key" ON "mcp_server"("slug");

-- CreateIndex
CREATE INDEX "log_sync_queue_syncStatus_serverId_idx" ON "log_sync_queue"("syncStatus", "serverId");

-- CreateIndex
CREATE INDEX "log_sync_queue_serverId_idx" ON "log_sync_queue"("serverId");

-- CreateIndex
CREATE INDEX "audit_log_serverId_createdAt_idx" ON "audit_log"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");
