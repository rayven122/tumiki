-- CreateEnum (db:push 済み環境での重複エラーを防ぐため DO ブロックで冪等化)
DO $$ BEGIN
  CREATE TYPE "LicenseType" AS ENUM ('PERSONAL', 'TENANT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'ERROR', 'DELETING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OidcType" AS ENUM ('KEYCLOAK', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "License" (
    "id" TEXT NOT NULL,
    "type" "LicenseType" NOT NULL,
    "subject" TEXT NOT NULL,
    "tenantId" TEXT,
    "features" TEXT[],
    "plan" TEXT,
    "jti" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "notes" TEXT,
    "issuedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'PROVISIONING',
    "oidcType" "OidcType" NOT NULL DEFAULT 'KEYCLOAK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "License_jti_key" ON "License"("jti");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "License_tenantId_idx" ON "License"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "License_status_expiresAt_idx" ON "License"("status", "expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "License_type_status_idx" ON "License"("type", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "License_subject_idx" ON "License"("subject");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_domain_key" ON "Tenant"("domain");

-- AddForeignKey (重複制約エラーを DO ブロックで安全処理)
DO $$ BEGIN
  ALTER TABLE "License" ADD CONSTRAINT "License_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
