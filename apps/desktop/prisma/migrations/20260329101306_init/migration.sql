-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "McpCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "iconPath" TEXT,
    "transportType" TEXT NOT NULL DEFAULT 'stdio',
    "command" TEXT,
    "defaultArgs" TEXT NOT NULL DEFAULT '[]',
    "serverUrl" TEXT,
    "envVarKeys" TEXT NOT NULL DEFAULT '[]',
    "authType" TEXT NOT NULL DEFAULT 'none',
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "serverStatus" TEXT NOT NULL DEFAULT 'stopped',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "McpServerConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transportType" TEXT NOT NULL DEFAULT 'stdio',
    "command" TEXT,
    "args" TEXT NOT NULL DEFAULT '[]',
    "serverUrl" TEXT,
    "envVars" TEXT NOT NULL DEFAULT '{}',
    "authType" TEXT NOT NULL DEFAULT 'none',
    "authToken" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "catalogId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "McpServerConnection_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "McpServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "McpServerConnection_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McpTool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "inputSchema" TEXT NOT NULL DEFAULT '{}',
    "customName" TEXT,
    "customDescription" TEXT,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "McpTool_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpServerConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" TEXT NOT NULL,
    "connectionId" TEXT,
    "toolName" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "inputBytes" INTEGER NOT NULL DEFAULT 0,
    "outputBytes" INTEGER NOT NULL DEFAULT 0,
    "isSuccess" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" INTEGER,
    "errorSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "McpServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "McpCatalog_slug_key" ON "McpCatalog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "McpServer_slug_key" ON "McpServer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "McpTool_connectionId_name_key" ON "McpTool"("connectionId", "name");
