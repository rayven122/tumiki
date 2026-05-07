CREATE TABLE "DesktopApiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "organizationName" TEXT,
    "organizationSlug" TEXT,
    "catalogEnabled" BOOLEAN NOT NULL DEFAULT false,
    "accessRequestsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "policySyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "auditLogSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesktopApiSettings_pkey" PRIMARY KEY ("id")
);
