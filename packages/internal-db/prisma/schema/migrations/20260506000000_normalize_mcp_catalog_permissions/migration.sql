-- McpCatalog / McpCatalogTool への接続テンプレート・権限モデル正規化マイグレーション。
-- 警告: このマイグレーションは不可逆です。
-- configTemplate と旧権限テーブルをバックフィル後に削除します。
-- 本番適用前に必ずフルバックアップを取得してください。
-- 既存DBへの適用はPrisma migrate deployを前提にし、db pushでは実行しません。
-- 手動psql適用時は部分適用を避けるため、BEGIN/COMMITでこのSQL全体を囲んでください。
-- このSQLは旧権限テーブルが存在する既存DBへの適用を前提にし、新規DBは全マイグレーション履歴またはdb pushで構築します。
-- 旧モデルの個人承認はグループDENYより優先される場合がありましたが、新モデルではDENY優先のためグループDENYが個人ALLOWを上書きします。

ALTER TABLE "McpCatalog"
ADD COLUMN "command" TEXT,
ADD COLUMN "args" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "url" TEXT;

DO $$
DECLARE
  invalid_config_args_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_config_args_count
  FROM "McpCatalog" catalog
  WHERE jsonb_typeof(catalog."configTemplate") = 'object'
    AND jsonb_typeof(catalog."configTemplate"->'args') = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(catalog."configTemplate"->'args') AS arg(value)
      WHERE jsonb_typeof(arg.value) <> 'string'
    );

  IF invalid_config_args_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % McpCatalog rows because configTemplate.args contains non-string values', invalid_config_args_count;
  END IF;
END $$;

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

DO $$
DECLARE
  null_stdio_command_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_stdio_command_count
  FROM "McpCatalog" catalog
  WHERE catalog."transportType" = 'STDIO'
    AND catalog."deletedAt" IS NULL
    AND catalog."command" IS NULL;

  IF null_stdio_command_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % active STDIO McpCatalog rows because command is NULL after configTemplate backfill', null_stdio_command_count;
  END IF;
END $$;

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
  invalid_org_unit_tool_permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_org_unit_tool_permission_count
  FROM "OrgUnitToolPermission" otp
  WHERE NOT EXISTS (
    SELECT 1
    FROM "McpCatalogTool" tool
    WHERE tool."id" = otp."toolId"
      AND tool."catalogId" = otp."catalogId"
  );

  IF invalid_org_unit_tool_permission_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % OrgUnitToolPermission rows because catalogId does not match toolId', invalid_org_unit_tool_permission_count;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "check_mcp_catalog_tool_permission_catalog"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "McpCatalogTool" tool
    WHERE tool."id" = NEW."toolId"
      AND tool."catalogId" = NEW."catalogId"
  ) THEN
    RAISE EXCEPTION 'MCP tool permission catalogId (%) does not match toolId (%)', NEW."catalogId", NEW."toolId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "OrgUnitToolPermission_catalog_match" ON "OrgUnitToolPermission";
CREATE TRIGGER "OrgUnitToolPermission_catalog_match"
BEFORE INSERT OR UPDATE OF "catalogId", "toolId" ON "OrgUnitToolPermission"
FOR EACH ROW EXECUTE FUNCTION "check_mcp_catalog_tool_permission_catalog"();

CREATE INDEX IF NOT EXISTS "OrgUnitToolPermission_toolId_idx" ON "OrgUnitToolPermission"("toolId");
CREATE INDEX IF NOT EXISTS "GroupCatalogToolPermission_toolId_idx" ON "GroupCatalogToolPermission"("toolId");
CREATE INDEX IF NOT EXISTS "UserCatalogToolPermission_toolId_idx" ON "UserCatalogToolPermission"("toolId");
CREATE INDEX IF NOT EXISTS "McpCatalog_name_id_idx" ON "McpCatalog"("name", "id");

DROP TRIGGER IF EXISTS "GroupCatalogToolPermission_catalog_match" ON "GroupCatalogToolPermission";
CREATE TRIGGER "GroupCatalogToolPermission_catalog_match"
BEFORE INSERT OR UPDATE OF "catalogId", "toolId" ON "GroupCatalogToolPermission"
FOR EACH ROW EXECUTE FUNCTION "check_mcp_catalog_tool_permission_catalog"();

DROP TRIGGER IF EXISTS "UserCatalogToolPermission_catalog_match" ON "UserCatalogToolPermission";
CREATE TRIGGER "UserCatalogToolPermission_catalog_match"
BEFORE INSERT OR UPDATE OF "catalogId", "toolId" ON "UserCatalogToolPermission"
FOR EACH ROW EXECUTE FUNCTION "check_mcp_catalog_tool_permission_catalog"();

DO $$
DECLARE
  unmatched_group_server_count INTEGER;
  unmatched_individual_server_count INTEGER;
  ambiguous_group_server_count INTEGER;
  ambiguous_individual_server_count INTEGER;
  unmatched_group_tool_count INTEGER;
  unmatched_user_tool_count INTEGER;
  duplicate_group_tool_count INTEGER;
  duplicate_user_tool_count INTEGER;
  orphaned_group_tool_allow_count INTEGER;
  conflicting_group_tool_deny_with_individual_count INTEGER;
  conflicting_user_tool_deny_with_individual_count INTEGER;
  missing_legacy_permission_tables TEXT[];
BEGIN
  -- 旧権限テーブルからのbackfillを行うため、このマイグレーション単体を空DBへ適用することはサポートしない。
  SELECT ARRAY_AGG(required_table.table_name ORDER BY required_table.table_name)
  INTO missing_legacy_permission_tables
  FROM (
    VALUES
      ('GroupToolPermission'),
      ('GroupMcpToolPermission'),
      ('UserMcpToolPermission'),
      ('IndividualPermission')
  ) AS required_table(table_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.tables existing_table
    WHERE existing_table.table_schema = current_schema()
      AND existing_table.table_name = required_table.table_name
  );

  IF missing_legacy_permission_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot backfill MCP permissions because legacy permission tables are missing: %', array_to_string(missing_legacy_permission_tables, ', ');
  END IF;

  SELECT COUNT(*) INTO unmatched_group_server_count
  FROM "GroupToolPermission" gtp
  WHERE (gtp."read" OR gtp."write" OR gtp."execute")
    AND NOT EXISTS (
      SELECT 1
      FROM "McpCatalog" catalog
      WHERE catalog."id" = gtp."mcpServerId" OR catalog."slug" = gtp."mcpServerId"
    );

  IF unmatched_group_server_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % GroupToolPermission rows because mcpServerId does not match McpCatalog.id or McpCatalog.slug', unmatched_group_server_count;
  END IF;

  SELECT COUNT(*) INTO ambiguous_group_server_count
  FROM (
    SELECT gtp."mcpServerId"
    FROM "GroupToolPermission" gtp
    JOIN "McpCatalog" catalog ON catalog."id" = gtp."mcpServerId" OR catalog."slug" = gtp."mcpServerId"
    WHERE gtp."read" OR gtp."write" OR gtp."execute"
    GROUP BY gtp."mcpServerId"
    HAVING COUNT(DISTINCT catalog."id") > 1
  ) ambiguous_group_servers;

  IF ambiguous_group_server_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate GroupToolPermission rows because % mcpServerId values match multiple McpCatalog rows by id/slug', ambiguous_group_server_count;
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
    RAISE EXCEPTION 'Cannot migrate % approved IndividualPermission rows because mcpServerId does not match McpCatalog.id or McpCatalog.slug', unmatched_individual_server_count;
  END IF;

  SELECT COUNT(*) INTO ambiguous_individual_server_count
  FROM (
    SELECT ip."mcpServerId"
    FROM "IndividualPermission" ip
    JOIN "McpCatalog" catalog ON catalog."id" = ip."mcpServerId" OR catalog."slug" = ip."mcpServerId"
    WHERE ip."status" = 'APPROVED'
      AND (ip."expiresAt" IS NULL OR ip."expiresAt" > CURRENT_TIMESTAMP)
    GROUP BY ip."mcpServerId"
    HAVING COUNT(DISTINCT catalog."id") > 1
  ) ambiguous_individual_servers;

  IF ambiguous_individual_server_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate approved IndividualPermission rows because % mcpServerId values match multiple McpCatalog rows by id/slug', ambiguous_individual_server_count;
  END IF;

  SELECT COUNT(*) INTO unmatched_group_tool_count
  FROM "GroupMcpToolPermission" gmtp
  WHERE NOT EXISTS (
    SELECT 1
    FROM "McpCatalogTool" tool
    WHERE tool."id" = gmtp."mcpToolId"
  );

  IF unmatched_group_tool_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % GroupMcpToolPermission rows because mcpToolId does not match McpCatalogTool.id', unmatched_group_tool_count;
  END IF;

  SELECT COUNT(*) INTO unmatched_user_tool_count
  FROM "UserMcpToolPermission" umtp
  WHERE (umtp."expiresAt" IS NULL OR umtp."expiresAt" > CURRENT_TIMESTAMP)
    AND NOT EXISTS (
      SELECT 1
      FROM "McpCatalogTool" tool
      WHERE tool."id" = umtp."mcpToolId"
    );

  IF unmatched_user_tool_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % UserMcpToolPermission rows because mcpToolId does not match McpCatalogTool.id', unmatched_user_tool_count;
  END IF;

  SELECT COUNT(*) INTO duplicate_group_tool_count
  FROM (
    SELECT gmtp."groupId", gmtp."mcpToolId"
    FROM "GroupMcpToolPermission" gmtp
    GROUP BY gmtp."groupId", gmtp."mcpToolId"
    HAVING COUNT(*) > 1
  ) duplicate_group_tools;

  IF duplicate_group_tool_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate GroupMcpToolPermission because % group/tool keys have duplicate rows', duplicate_group_tool_count;
  END IF;

  SELECT COUNT(*) INTO duplicate_user_tool_count
  FROM (
    SELECT umtp."userId", umtp."mcpToolId"
    FROM "UserMcpToolPermission" umtp
    WHERE umtp."expiresAt" IS NULL OR umtp."expiresAt" > CURRENT_TIMESTAMP
    GROUP BY umtp."userId", umtp."mcpToolId"
    HAVING COUNT(*) > 1
  ) duplicate_user_tools;

  IF duplicate_user_tool_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate UserMcpToolPermission because % user/tool keys have duplicate rows', duplicate_user_tool_count;
  END IF;

  SELECT COUNT(*) INTO orphaned_group_tool_allow_count
  FROM "GroupMcpToolPermission" gmtp
  JOIN "McpCatalogTool" tool ON tool."id" = gmtp."mcpToolId"
  WHERE gmtp."canUse"
    AND NOT EXISTS (
      SELECT 1
      FROM "GroupToolPermission" gtp
      WHERE gtp."groupId" = gmtp."groupId"
        AND (gtp."read" OR gtp."write" OR gtp."execute")
        AND EXISTS (
          SELECT 1
          FROM "McpCatalog" catalog
          WHERE catalog."id" = tool."catalogId"
            AND (catalog."id" = gtp."mcpServerId" OR catalog."slug" = gtp."mcpServerId")
        )
    );

  IF orphaned_group_tool_allow_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % GroupMcpToolPermission allow rows because their group has no active GroupToolPermission for the tool catalog', orphaned_group_tool_allow_count;
  END IF;

  -- 旧canUse=falseは新モデルで明示DENYにするため、既存の有効な個人承認を上書きするデータは移行前に止める。
  SELECT COUNT(*) INTO conflicting_group_tool_deny_with_individual_count
  FROM "GroupMcpToolPermission" gmtp
  JOIN "McpCatalogTool" tool ON tool."id" = gmtp."mcpToolId"
  JOIN "McpCatalog" catalog ON catalog."id" = tool."catalogId"
  JOIN "UserGroupMembership" membership ON membership."groupId" = gmtp."groupId"
  JOIN "IndividualPermission" ip ON ip."userId" = membership."userId"
  WHERE NOT gmtp."canUse"
    AND ip."status" = 'APPROVED'
    AND (ip."expiresAt" IS NULL OR ip."expiresAt" > CURRENT_TIMESTAMP)
    AND (catalog."id" = ip."mcpServerId" OR catalog."slug" = ip."mcpServerId");

  IF conflicting_group_tool_deny_with_individual_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % GroupMcpToolPermission deny rows because they would override active approved IndividualPermission rows', conflicting_group_tool_deny_with_individual_count;
  END IF;

  SELECT COUNT(*) INTO conflicting_user_tool_deny_with_individual_count
  FROM "UserMcpToolPermission" umtp
  JOIN "McpCatalogTool" tool ON tool."id" = umtp."mcpToolId"
  JOIN "McpCatalog" catalog ON catalog."id" = tool."catalogId"
  JOIN "IndividualPermission" ip ON ip."userId" = umtp."userId"
  WHERE NOT umtp."canUse"
    AND (umtp."expiresAt" IS NULL OR umtp."expiresAt" > CURRENT_TIMESTAMP)
    AND ip."status" = 'APPROVED'
    AND (ip."expiresAt" IS NULL OR ip."expiresAt" > CURRENT_TIMESTAMP)
    AND (catalog."id" = ip."mcpServerId" OR catalog."slug" = ip."mcpServerId");

  IF conflicting_user_tool_deny_with_individual_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate % UserMcpToolPermission deny rows because they would override active approved IndividualPermission rows', conflicting_user_tool_deny_with_individual_count;
  END IF;
END $$;

-- Prismaのcuid()はPostgreSQLだけでは生成しづらいため、backfill行はUUID文字列を使用する。
-- 新規行とID形式は混在するが、主キーとしての一意性だけを要求するため機能上の影響はない。
INSERT INTO "GroupCatalogPermission" ("id", "groupId", "catalogId", "effect", "createdAt", "updatedAt")
-- GroupToolPermissionにはcreatedAt/updatedAtカラムがないため、
-- このカタログ単位のALLOW行は合成データとしてマイグレーション実行時刻を使用する。
SELECT DISTINCT ON (gtp."groupId", catalog."id")
  gen_random_uuid()::TEXT,
  gtp."groupId",
  catalog."id",
  'ALLOW'::"PolicyEffect",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "GroupToolPermission" gtp
JOIN "McpCatalog" catalog ON catalog."id" = gtp."mcpServerId" OR catalog."slug" = gtp."mcpServerId"
WHERE (gtp."read" OR gtp."write" OR gtp."execute")
  -- 論理削除済みカタログへの旧権限は新モデルへ移行しない。
  AND catalog."deletedAt" IS NULL
ORDER BY gtp."groupId", catalog."id";

-- OrgUnitToolPermissionは既存行をそのまま保持する。
-- カタログ単位のOrgUnitCatalogPermissionは旧モデルに相当するデータがないため、
-- backfillせず管理画面から新規設定する運用とする。
INSERT INTO "GroupCatalogToolPermission" ("id", "groupId", "catalogId", "toolId", "effect", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  gmtp."groupId",
  tool."catalogId",
  tool."id",
  CASE WHEN gmtp."canUse" THEN 'ALLOW'::"PolicyEffect" ELSE 'DENY'::"PolicyEffect" END,
  gmtp."createdAt",
  gmtp."updatedAt"
FROM "GroupMcpToolPermission" gmtp
JOIN "McpCatalogTool" tool ON tool."id" = gmtp."mcpToolId";

INSERT INTO "UserCatalogToolPermission" ("id", "userId", "catalogId", "toolId", "effect", "reason", "expiresAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
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
WHERE umtp."expiresAt" IS NULL OR umtp."expiresAt" > CURRENT_TIMESTAMP;

INSERT INTO "UserCatalogPermission" ("id", "userId", "catalogId", "effect", "reason", "expiresAt", "createdAt", "updatedAt")
SELECT DISTINCT ON (ip."userId", catalog."id")
  gen_random_uuid()::TEXT,
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
ORDER BY ip."userId", catalog."id", ip."updatedAt" DESC;

ALTER TABLE "McpCatalog" DROP COLUMN "configTemplate";

DROP TABLE "UserMcpToolPermission";
DROP TABLE "GroupMcpToolPermission";
DROP TABLE "IndividualPermission";
DROP TABLE "GroupToolPermission";

DROP TYPE "ApprovalStatus";
