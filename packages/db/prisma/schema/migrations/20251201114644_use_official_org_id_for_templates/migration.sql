-- 公式テンプレート用の特別なorganizationIDを使用
-- nullの代わりに固定IDを使うことで、findUniqueで高速検索が可能になる

-- 1. 既存の公式テンプレート（organizationId = null）を特別なIDに更新
UPDATE "McpServerTemplate"
SET "organizationId" = '00000000-0000-0000-0000-000000000000'
WHERE "organizationId" IS NULL;

-- 2. 関連するMcpOAuthClientも更新
UPDATE "McpOAuthClient"
SET "organizationId" = '00000000-0000-0000-0000-000000000000'
WHERE "organizationId" IS NULL
  AND "mcpServerTemplateId" IN (
    SELECT "id" FROM "McpServerTemplate" WHERE "organizationId" = '00000000-0000-0000-0000-000000000000'
  );
