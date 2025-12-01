-- 公式テンプレート用の特別なorganizationIDを使用
-- nullの代わりに固定IDを使うことで、findUniqueで高速検索が可能になる

-- 0-1. 公式ユーザーを作成（存在しない場合のみ）
INSERT INTO "User" (
  "id",
  "name",
  "email",
  "role",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Tumiki Official',
  'official@tumiki.cloud',
  'SYSTEM_ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- 0-2. 公式組織を作成（存在しない場合のみ）
INSERT INTO "Organization" (
  "id",
  "name",
  "slug",
  "createdBy",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Tumiki Official Organization',
  'tumiki-official',
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- 0-3. 公式ユーザーのデフォルト組織を設定
UPDATE "User"
SET "defaultOrganizationSlug" = 'tumiki-official'
WHERE "id" = '00000000-0000-0000-0000-000000000001';

-- 1. 既存の公式テンプレート（organizationId = null）を特別なIDに更新
UPDATE "McpServerTemplate"
SET
  "organizationId" = '00000000-0000-0000-0000-000000000000',
  "createdBy" = '00000000-0000-0000-0000-000000000001'
WHERE "organizationId" IS NULL;

-- 2. 関連するMcpOAuthClientも更新
UPDATE "McpOAuthClient"
SET "organizationId" = '00000000-0000-0000-0000-000000000000'
WHERE "organizationId" IS NULL
  AND "mcpServerTemplateId" IN (
    SELECT "id" FROM "McpServerTemplate" WHERE "organizationId" = '00000000-0000-0000-0000-000000000000'
  );
