-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OAuthClient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverUrl" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
    "authServerMetadata" TEXT NOT NULL,
    "isDcr" BOOLEAN NOT NULL DEFAULT true,
    "disableRuntimeRefresh" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OAuthClient" ("authServerMetadata", "clientId", "clientSecret", "createdAt", "id", "isDcr", "issuer", "serverUrl", "tokenEndpointAuthMethod", "updatedAt") SELECT "authServerMetadata", "clientId", "clientSecret", "createdAt", "id", "isDcr", "issuer", "serverUrl", "tokenEndpointAuthMethod", "updatedAt" FROM "OAuthClient";
DROP TABLE "OAuthClient";
ALTER TABLE "new_OAuthClient" RENAME TO "OAuthClient";
CREATE UNIQUE INDEX "OAuthClient_serverUrl_key" ON "OAuthClient"("serverUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
