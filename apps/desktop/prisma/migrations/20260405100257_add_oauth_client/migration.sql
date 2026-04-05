-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverUrl" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
    "authServerMetadata" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_serverUrl_key" ON "OAuthClient"("serverUrl");
