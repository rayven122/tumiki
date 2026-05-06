-- McpSecret を新設し McpConnection.credentials を secretId に置き換える
-- 仮想MCP/元コネクタは secret を共有することで credentials を単一情報源化する
-- 既存データは「1接続 = 1 secret」で取り込む（安全側に倒して非共有）
-- SQLite は ALTER TABLE DROP COLUMN を一部しかサポートしないためテーブル再作成方式を採用

-- CreateTable
CREATE TABLE "McpSecret" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "credentials" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 既存 credentials を McpSecret に持ち上げる（id を一致させて 1:1 対応）
INSERT INTO "McpSecret" ("id", "credentials", "createdAt", "updatedAt")
SELECT "id", "credentials", "createdAt", "updatedAt" FROM "McpConnection";

-- 次回 INSERT で衝突しないよう sqlite_sequence を更新
INSERT OR REPLACE INTO "sqlite_sequence" ("name", "seq")
SELECT 'McpSecret', COALESCE(MAX("id"), 0) FROM "McpSecret";

-- McpConnection を再作成して credentials → secretId へ置き換え
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_McpConnection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "transportType" TEXT NOT NULL DEFAULT 'STDIO',
    "command" TEXT,
    "args" TEXT NOT NULL DEFAULT '[]',
    "url" TEXT,
    "authType" TEXT NOT NULL DEFAULT 'NONE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "serverId" INTEGER NOT NULL,
    "catalogId" INTEGER,
    "secretId" INTEGER NOT NULL,
    CONSTRAINT "McpConnection_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "McpServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "McpConnection_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "McpConnection_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "McpSecret" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_McpConnection" ("id", "name", "slug", "transportType", "command", "args", "url", "authType", "isEnabled", "displayOrder", "createdAt", "updatedAt", "serverId", "catalogId", "secretId")
SELECT "id", "name", "slug", "transportType", "command", "args", "url", "authType", "isEnabled", "displayOrder", "createdAt", "updatedAt", "serverId", "catalogId", "id" AS "secretId" FROM "McpConnection";

DROP TABLE "McpConnection";
ALTER TABLE "new_McpConnection" RENAME TO "McpConnection";

CREATE UNIQUE INDEX "McpConnection_serverId_slug_key" ON "McpConnection"("serverId", "slug");
-- 参照カウント運用（deleteSecretIfOrphaned の COUNT）と FK 整合性のため secretId に索引を張る
CREATE INDEX "McpConnection_secretId_idx" ON "McpConnection"("secretId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
