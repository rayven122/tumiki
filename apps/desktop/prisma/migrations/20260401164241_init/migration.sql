-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "idToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "McpCatalog" (
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
CREATE TABLE "McpConnection" (
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
    CONSTRAINT "McpConnection_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "McpServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "McpConnection_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McpTool" (
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
    CONSTRAINT "McpTool_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McpServer" (
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
CREATE TABLE "LogSyncQueue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" TEXT NOT NULL,
    "logEntry" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" DATETIME
);

-- CreateTable
CREATE TABLE "AuditLog" (
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
    CONSTRAINT "AuditLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "McpServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "McpCatalog_name_key" ON "McpCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "McpConnection_serverId_slug_key" ON "McpConnection"("serverId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "McpTool_connectionId_name_key" ON "McpTool"("connectionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "McpServer_slug_key" ON "McpServer"("slug");

-- CreateIndex
CREATE INDEX "LogSyncQueue_syncStatus_serverId_idx" ON "LogSyncQueue"("syncStatus", "serverId");

-- CreateIndex
CREATE INDEX "LogSyncQueue_serverId_idx" ON "LogSyncQueue"("serverId");

-- CreateIndex
CREATE INDEX "AuditLog_serverId_createdAt_idx" ON "AuditLog"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
