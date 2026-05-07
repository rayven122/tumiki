-- PostgreSQL の ENUM 型は ADD VALUE を UNDO できないため、型の再定義で BEARER を完全除去する。
-- 事前確認済み: BEARER の値を持つレコードは存在しない。
--
-- ALTER COLUMN TYPE は DEFAULT 値を新型へ自動 cast できないため
-- （ERROR 42804: default for column ... cannot be cast automatically）、
-- 先に DROP DEFAULT → 型変更 → SET DEFAULT の順で適用する。

-- 1. DEFAULT を一旦外す
ALTER TABLE "McpServerTemplate" ALTER COLUMN "authType" DROP DEFAULT;
ALTER TABLE "McpServer" ALTER COLUMN "authType" DROP DEFAULT;

-- 2. BEARER を含まない新しい ENUM 型を作成
CREATE TYPE "AuthType_new" AS ENUM ('NONE', 'API_KEY', 'OAUTH');

-- 3. McpServerTemplate の authType 列を新しい型に変更
ALTER TABLE "McpServerTemplate"
  ALTER COLUMN "authType" TYPE "AuthType_new"
  USING "authType"::text::"AuthType_new";

-- 4. McpServer の authType 列を新しい型に変更
ALTER TABLE "McpServer"
  ALTER COLUMN "authType" TYPE "AuthType_new"
  USING "authType"::text::"AuthType_new";

-- 5. 古い型を削除
DROP TYPE "AuthType";

-- 6. 新しい型を AuthType にリネーム
ALTER TYPE "AuthType_new" RENAME TO "AuthType";

-- 7. DEFAULT を再設定（schema.prisma の @default と一致させる）
ALTER TABLE "McpServerTemplate" ALTER COLUMN "authType" SET DEFAULT 'NONE';
ALTER TABLE "McpServer" ALTER COLUMN "authType" SET DEFAULT 'API_KEY';
