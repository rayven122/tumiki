-- AlterEnum: TenantStatus に UPGRADING を追加（冪等）
DO $$ BEGIN
  ALTER TYPE "TenantStatus" ADD VALUE 'UPGRADING';
EXCEPTION WHEN duplicate_object THEN null; END $$;
