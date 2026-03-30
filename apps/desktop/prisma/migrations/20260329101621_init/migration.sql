-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "idToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "log_sync_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" TEXT NOT NULL,
    "logEntry" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" DATETIME
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "log_sync_queue_syncStatus_serverId_idx" ON "log_sync_queue"("syncStatus", "serverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "log_sync_queue_serverId_idx" ON "log_sync_queue"("serverId");
