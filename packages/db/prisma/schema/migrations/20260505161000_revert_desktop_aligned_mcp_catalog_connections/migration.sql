-- PR #1210 で追加された packages/db の MCP カタログストレージを切り戻す。
-- Desktop/internal-manager のカタログフローは packages/internal-db を使用するため、
-- Manager 向け DB は PR #1210 以前の MCP スキーマを維持する。

UPDATE "McpServerTemplate"
SET "transportType" = 'STREAMABLE_HTTPS'
WHERE "transportType" = 'STREAMABLE_HTTP';

UPDATE "McpServerTemplate"
SET "authType" = 'API_KEY'
WHERE "authType" = 'BEARER';

UPDATE "McpServer"
SET "authType" = 'API_KEY'
WHERE "authType" = 'BEARER';

-- schema 対象から STREAMABLE_HTTP を外すため、既存ログは最も近い既存値へ寄せる。
UPDATE "McpServerRequestLog"
SET "transportType" = 'STREAMABLE_HTTPS'
WHERE "transportType" = 'STREAMABLE_HTTP';

ALTER TABLE "McpTool" DROP CONSTRAINT IF EXISTS "McpTool_mcpConnectionId_fkey";
DROP INDEX IF EXISTS "McpTool_mcpConnectionId_name_key";

-- PR #1210 で McpConnection 経由で登録されたツール行を削除する。
-- mcpServerTemplateId が必須に戻るため、テンプレートに紐づかない行は保持できない。
DELETE FROM "McpTool"
WHERE "mcpServerTemplateId" IS NULL;

ALTER TABLE "McpTool" DROP COLUMN IF EXISTS "mcpConnectionId";
ALTER TABLE "McpTool" DROP COLUMN IF EXISTS "isAllowed";
ALTER TABLE "McpTool" DROP COLUMN IF EXISTS "reviewStatus";
ALTER TABLE "McpTool" DROP COLUMN IF EXISTS "discoveredAt";
ALTER TABLE "McpTool" DROP COLUMN IF EXISTS "lastSeenAt";
ALTER TABLE "McpTool" DROP COLUMN IF EXISTS "schemaHash";
ALTER TABLE "McpTool" ALTER COLUMN "mcpServerTemplateId" SET NOT NULL;

DROP TABLE IF EXISTS "OAuthClient";
DROP TABLE IF EXISTS "McpConnection";
DROP TABLE IF EXISTS "McpCatalog";

DROP TYPE IF EXISTS "McpToolReviewStatus";
