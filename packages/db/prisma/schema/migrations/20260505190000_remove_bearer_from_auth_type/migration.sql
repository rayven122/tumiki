-- PostgreSQL の ENUM 型は ADD VALUE を UNDO できないため、型の再定義で BEARER を完全除去する。
-- 事前確認済み: BEARER の値を持つレコードは存在しない。

-- 1. BEARER を含まない新しい ENUM 型を作成
CREATE TYPE "AuthType_new" AS ENUM ('NONE', 'API_KEY', 'OAUTH');

-- 2. McpServerTemplate の authType 列を新しい型に変更
ALTER TABLE "McpServerTemplate"
  ALTER COLUMN "authType" TYPE "AuthType_new"
  USING "authType"::text::"AuthType_new";

-- 3. McpServer の authType 列を新しい型に変更
ALTER TABLE "McpServer"
  ALTER COLUMN "authType" TYPE "AuthType_new"
  USING "authType"::text::"AuthType_new";

-- 4. 古い型を削除
DROP TYPE "AuthType";

-- 5. 新しい型を AuthType にリネーム
ALTER TYPE "AuthType_new" RENAME TO "AuthType";
