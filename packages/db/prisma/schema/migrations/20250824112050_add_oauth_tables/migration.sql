-- CreateTable
CREATE TABLE "public"."OAuthClient" (
    "id" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "registrationAccessToken" TEXT,
    "registrationClientUri" TEXT,
    "authorizationServerUrl" TEXT NOT NULL,
    "tokenEndpoint" TEXT NOT NULL,
    "authorizationEndpoint" TEXT NOT NULL,
    "registrationEndpoint" TEXT,
    "jwksUri" TEXT,
    "revocationEndpoint" TEXT,
    "introspectionEndpoint" TEXT,
    "protectedResourceUrl" TEXT,
    "resourceIndicator" TEXT,
    "scopes" TEXT[],
    "grantTypes" TEXT[],
    "responseTypes" TEXT[],
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'client_secret_basic',
    "redirectUris" TEXT[],
    "applicationName" TEXT,
    "applicationUri" TEXT,
    "logoUri" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OAuthToken" (
    "id" TEXT NOT NULL,
    "userMcpConfigId" TEXT NOT NULL,
    "oauthClientId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "refreshExpiresAt" TIMESTAMP(3),
    "state" TEXT,
    "nonce" TEXT,
    "codeVerifier" TEXT,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT DEFAULT 'S256',
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "refreshCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OAuthSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "state" TEXT NOT NULL,
    "nonce" TEXT,
    "redirectUri" TEXT NOT NULL,
    "requestedScopes" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OAuthClient_clientId_idx" ON "public"."OAuthClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_mcpServerId_key" ON "public"."OAuthClient"("mcpServerId");

-- CreateIndex
CREATE INDEX "OAuthToken_oauthClientId_idx" ON "public"."OAuthToken"("oauthClientId");

-- CreateIndex
CREATE INDEX "OAuthToken_expiresAt_idx" ON "public"."OAuthToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_userMcpConfigId_key" ON "public"."OAuthToken"("userMcpConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthSession_sessionId_key" ON "public"."OAuthSession"("sessionId");

-- CreateIndex
CREATE INDEX "OAuthSession_sessionId_idx" ON "public"."OAuthSession"("sessionId");

-- CreateIndex
CREATE INDEX "OAuthSession_state_idx" ON "public"."OAuthSession"("state");

-- CreateIndex
CREATE INDEX "OAuthSession_expiresAt_idx" ON "public"."OAuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."OAuthClient" ADD CONSTRAINT "OAuthClient_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "public"."McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthToken" ADD CONSTRAINT "OAuthToken_userMcpConfigId_fkey" FOREIGN KEY ("userMcpConfigId") REFERENCES "public"."UserMcpServerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthToken" ADD CONSTRAINT "OAuthToken_oauthClientId_fkey" FOREIGN KEY ("oauthClientId") REFERENCES "public"."OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthSession" ADD CONSTRAINT "OAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;