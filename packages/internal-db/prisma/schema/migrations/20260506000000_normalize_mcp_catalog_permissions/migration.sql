-- Normalize MCP catalog connection templates and permissions onto McpCatalog/McpCatalogTool.

ALTER TABLE "McpCatalog"
ADD COLUMN "command" TEXT,
ADD COLUMN "args" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "url" TEXT;

UPDATE "McpCatalog"
SET
  "command" = CASE
    WHEN jsonb_typeof("configTemplate") = 'object' THEN "configTemplate"->>'command'
    ELSE NULL
  END,
  "url" = CASE
    WHEN jsonb_typeof("configTemplate") = 'object' THEN "configTemplate"->>'url'
    ELSE NULL
  END,
  "args" = CASE
    WHEN jsonb_typeof("configTemplate") = 'object'
      AND jsonb_typeof("configTemplate"->'args') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text("configTemplate"->'args'))
    ELSE ARRAY[]::TEXT[]
  END;

CREATE TABLE "OrgUnitCatalogPermission" (
  "id" TEXT NOT NULL,
  "orgUnitId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "effect" "PolicyEffect" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrgUnitCatalogPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupCatalogPermission" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "effect" "PolicyEffect" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GroupCatalogPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupCatalogToolPermission" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "effect" "PolicyEffect" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GroupCatalogToolPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCatalogPermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "effect" "PolicyEffect" NOT NULL,
  "reason" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserCatalogPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCatalogToolPermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "effect" "PolicyEffect" NOT NULL,
  "reason" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserCatalogToolPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgUnitCatalogPermission_orgUnitId_catalogId_key" ON "OrgUnitCatalogPermission"("orgUnitId", "catalogId");
CREATE INDEX "OrgUnitCatalogPermission_catalogId_idx" ON "OrgUnitCatalogPermission"("catalogId");
CREATE INDEX "OrgUnitCatalogPermission_effect_idx" ON "OrgUnitCatalogPermission"("effect");

CREATE UNIQUE INDEX "GroupCatalogPermission_groupId_catalogId_key" ON "GroupCatalogPermission"("groupId", "catalogId");
CREATE INDEX "GroupCatalogPermission_catalogId_idx" ON "GroupCatalogPermission"("catalogId");
CREATE INDEX "GroupCatalogPermission_effect_idx" ON "GroupCatalogPermission"("effect");

CREATE UNIQUE INDEX "GroupCatalogToolPermission_groupId_toolId_key" ON "GroupCatalogToolPermission"("groupId", "toolId");
CREATE INDEX "GroupCatalogToolPermission_catalogId_idx" ON "GroupCatalogToolPermission"("catalogId");
CREATE INDEX "GroupCatalogToolPermission_effect_idx" ON "GroupCatalogToolPermission"("effect");

CREATE UNIQUE INDEX "UserCatalogPermission_userId_catalogId_key" ON "UserCatalogPermission"("userId", "catalogId");
CREATE INDEX "UserCatalogPermission_catalogId_idx" ON "UserCatalogPermission"("catalogId");
CREATE INDEX "UserCatalogPermission_effect_idx" ON "UserCatalogPermission"("effect");
CREATE INDEX "UserCatalogPermission_expiresAt_idx" ON "UserCatalogPermission"("expiresAt");

CREATE UNIQUE INDEX "UserCatalogToolPermission_userId_toolId_key" ON "UserCatalogToolPermission"("userId", "toolId");
CREATE INDEX "UserCatalogToolPermission_catalogId_idx" ON "UserCatalogToolPermission"("catalogId");
CREATE INDEX "UserCatalogToolPermission_effect_idx" ON "UserCatalogToolPermission"("effect");
CREATE INDEX "UserCatalogToolPermission_expiresAt_idx" ON "UserCatalogToolPermission"("expiresAt");

ALTER TABLE "OrgUnitCatalogPermission" ADD CONSTRAINT "OrgUnitCatalogPermission_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgUnitCatalogPermission" ADD CONSTRAINT "OrgUnitCatalogPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupCatalogPermission" ADD CONSTRAINT "GroupCatalogPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCatalogPermission" ADD CONSTRAINT "GroupCatalogPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupCatalogToolPermission" ADD CONSTRAINT "GroupCatalogToolPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCatalogToolPermission" ADD CONSTRAINT "GroupCatalogToolPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCatalogToolPermission" ADD CONSTRAINT "GroupCatalogToolPermission_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "McpCatalogTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCatalogPermission" ADD CONSTRAINT "UserCatalogPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCatalogPermission" ADD CONSTRAINT "UserCatalogPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCatalogToolPermission" ADD CONSTRAINT "UserCatalogToolPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCatalogToolPermission" ADD CONSTRAINT "UserCatalogToolPermission_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "McpCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCatalogToolPermission" ADD CONSTRAINT "UserCatalogToolPermission_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "McpCatalogTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE
  unmatched_group_server_count INTEGER;
  unmatched_individual_server_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmatched_group_server_count
  FROM "GroupToolPermission" gtp
  WHERE (gtp."read" OR gtp."write" OR gtp."execute")
    AND NOT EXISTS (
      SELECT 1
      FROM "McpCatalog" catalog
      WHERE catalog."id" = gtp."mcpServerId" OR catalog."slug" = gtp."mcpServerId"
    );

  IF unmatched_group_server_count > 0 THEN
    RAISE NOTICE 'Skipped % GroupToolPermission rows because mcpServerId did not match McpCatalog.id or McpCatalog.slug', unmatched_group_server_count;
  END IF;

  SELECT COUNT(*) INTO unmatched_individual_server_count
  FROM "IndividualPermission" ip
  WHERE ip."status" = 'APPROVED'
    AND (ip."expiresAt" IS NULL OR ip."expiresAt" > CURRENT_TIMESTAMP)
    AND NOT EXISTS (
      SELECT 1
      FROM "McpCatalog" catalog
      WHERE catalog."id" = ip."mcpServerId" OR catalog."slug" = ip."mcpServerId"
    );

  IF unmatched_individual_server_count > 0 THEN
    RAISE NOTICE 'Skipped % approved IndividualPermission rows because mcpServerId did not match McpCatalog.id or McpCatalog.slug', unmatched_individual_server_count;
  END IF;
END $$;

INSERT INTO "GroupCatalogPermission" ("id", "groupId", "catalogId", "effect", "createdAt", "updatedAt")
SELECT DISTINCT ON (gtp."groupId", catalog."id")
  concat('migrated_gtp_', md5(gtp."groupId" || ':' || catalog."id")),
  gtp."groupId",
  catalog."id",
  'ALLOW'::"PolicyEffect",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "GroupToolPermission" gtp
JOIN "McpCatalog" catalog ON catalog."id" = gtp."mcpServerId" OR catalog."slug" = gtp."mcpServerId"
WHERE gtp."read" OR gtp."write" OR gtp."execute"
ORDER BY gtp."groupId", catalog."id"
ON CONFLICT ("groupId", "catalogId") DO NOTHING;

INSERT INTO "GroupCatalogToolPermission" ("id", "groupId", "catalogId", "toolId", "effect", "createdAt", "updatedAt")
SELECT
  concat('migrated_gmtp_', md5(gmtp."groupId" || ':' || tool."id")),
  gmtp."groupId",
  tool."catalogId",
  tool."id",
  CASE WHEN gmtp."canUse" THEN 'ALLOW'::"PolicyEffect" ELSE 'DENY'::"PolicyEffect" END,
  gmtp."createdAt",
  gmtp."updatedAt"
FROM "GroupMcpToolPermission" gmtp
JOIN "McpCatalogTool" tool ON tool."id" = gmtp."mcpToolId"
ON CONFLICT ("groupId", "toolId") DO NOTHING;

INSERT INTO "UserCatalogToolPermission" ("id", "userId", "catalogId", "toolId", "effect", "reason", "expiresAt", "createdAt", "updatedAt")
SELECT
  concat('migrated_umtp_', md5(umtp."userId" || ':' || tool."id")),
  umtp."userId",
  tool."catalogId",
  tool."id",
  CASE WHEN umtp."canUse" THEN 'ALLOW'::"PolicyEffect" ELSE 'DENY'::"PolicyEffect" END,
  umtp."reason",
  umtp."expiresAt",
  umtp."createdAt",
  umtp."updatedAt"
FROM "UserMcpToolPermission" umtp
JOIN "McpCatalogTool" tool ON tool."id" = umtp."mcpToolId"
ON CONFLICT ("userId", "toolId") DO NOTHING;

INSERT INTO "UserCatalogPermission" ("id", "userId", "catalogId", "effect", "reason", "expiresAt", "createdAt", "updatedAt")
SELECT DISTINCT ON (ip."userId", catalog."id")
  concat('migrated_ip_', md5(ip."userId" || ':' || catalog."id")),
  ip."userId",
  catalog."id",
  'ALLOW'::"PolicyEffect",
  ip."reason",
  ip."expiresAt",
  ip."createdAt",
  ip."updatedAt"
FROM "IndividualPermission" ip
JOIN "McpCatalog" catalog ON catalog."id" = ip."mcpServerId" OR catalog."slug" = ip."mcpServerId"
WHERE ip."status" = 'APPROVED'
  AND (ip."expiresAt" IS NULL OR ip."expiresAt" > CURRENT_TIMESTAMP)
ORDER BY ip."userId", catalog."id", ip."updatedAt" DESC
ON CONFLICT ("userId", "catalogId") DO NOTHING;

ALTER TABLE "McpCatalog" DROP COLUMN "configTemplate";

DROP TABLE "UserMcpToolPermission";
DROP TABLE "GroupMcpToolPermission";
DROP TABLE "IndividualPermission";
DROP TABLE "GroupToolPermission";

DROP TYPE "ApprovalStatus";
