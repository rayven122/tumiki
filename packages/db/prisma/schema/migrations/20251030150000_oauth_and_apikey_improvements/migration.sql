/*
  統合マイグレーション: OAuth と APIキーの改善

  このマイグレーションには以下の変更が含まれます:
  1. AuthType enum に CLOUD_RUN_IAM を追加
  2. TokenPurpose enum を作成（TUMIKI_CLIENT, BACKEND_MCP）
  3. McpApiKey に scopes フィールドを追加
  4. McpApiKey に userId フィールドを追加（既存データはOrganization.createdByから取得）
  5. OAuthToken に tokenPurpose フィールドを追加
  6. 各種インデックスを追加・最適化
*/

-- Step 1: Add CLOUD_RUN_IAM to AuthType enum
ALTER TYPE "public"."AuthType" ADD VALUE 'CLOUD_RUN_IAM';

-- Step 2: Create TokenPurpose enum
CREATE TYPE "public"."TokenPurpose" AS ENUM ('TUMIKI_CLIENT', 'BACKEND_MCP');

-- Step 3: Drop old unique index on OAuthToken
DROP INDEX IF EXISTS "public"."OAuthToken_userMcpConfigId_key";

-- Step 4: Add scopes column to McpApiKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'McpApiKey' AND column_name = 'scopes'
  ) THEN
    ALTER TABLE "public"."McpApiKey" ADD COLUMN "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

-- Step 5: Add userId column to McpApiKey (nullable first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'McpApiKey' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "public"."McpApiKey" ADD COLUMN "userId" TEXT;
  END IF;
END $$;

-- Step 6: Populate userId from Organization.createdBy
UPDATE "public"."McpApiKey" AS ak
SET "userId" = o."createdBy"
FROM "public"."UserMcpServerInstance" AS umsi
JOIN "public"."Organization" AS o ON umsi."organizationId" = o.id
WHERE ak."userMcpServerInstanceId" = umsi.id
AND ak."userId" IS NULL;

-- Step 7: Make userId NOT NULL
ALTER TABLE "public"."McpApiKey" ALTER COLUMN "userId" SET NOT NULL;

-- Step 8: Add tokenPurpose to OAuthToken
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'OAuthToken' AND column_name = 'tokenPurpose'
  ) THEN
    ALTER TABLE "public"."OAuthToken" ADD COLUMN "tokenPurpose" "public"."TokenPurpose" NOT NULL DEFAULT 'BACKEND_MCP';
  END IF;
END $$;

-- Step 9: Create indexes for McpApiKey
CREATE INDEX IF NOT EXISTS "McpApiKey_userId_idx" ON "public"."McpApiKey"("userId");
CREATE INDEX IF NOT EXISTS "McpApiKey_apiKeyHash_idx" ON "public"."McpApiKey"("apiKeyHash");

-- Step 10: Drop apiKey index if it exists (暗号化フィールドにはインデックスを作成しない)
DROP INDEX IF EXISTS "public"."McpApiKey_apiKey_idx";

-- Step 11: Create indexes for OAuthToken
CREATE INDEX IF NOT EXISTS "OAuthToken_isValid_idx" ON "public"."OAuthToken"("isValid");
CREATE INDEX IF NOT EXISTS "OAuthToken_tokenPurpose_idx" ON "public"."OAuthToken"("tokenPurpose");

-- Step 12: Create unique constraint for OAuthToken
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthToken_userMcpConfigId_tokenPurpose_key" ON "public"."OAuthToken"("userMcpConfigId", "tokenPurpose");

-- Step 13: Add foreign key constraint for McpApiKey.userId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'McpApiKey_userId_fkey'
    AND table_name = 'McpApiKey'
  ) THEN
    ALTER TABLE "public"."McpApiKey"
    ADD CONSTRAINT "McpApiKey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
