-- CreateIndex
CREATE INDEX "McpServer_organizationId_idx" ON "public"."McpServer"("organizationId");

-- CreateIndex
CREATE INDEX "McpServerRequestLog_organizationId_idx" ON "public"."McpServerRequestLog"("organizationId");

-- CreateIndex
CREATE INDEX "UserMcpServerConfig_organizationId_idx" ON "public"."UserMcpServerConfig"("organizationId");

-- CreateIndex
CREATE INDEX "UserMcpServerInstance_organizationId_idx" ON "public"."UserMcpServerInstance"("organizationId");

-- CreateIndex
CREATE INDEX "UserToolGroup_organizationId_idx" ON "public"."UserToolGroup"("organizationId");
