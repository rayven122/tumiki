CREATE TABLE "ObjectStorageSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "endpoint" TEXT,
    "region" TEXT,
    "bucket" TEXT,
    "publicBaseUrl" TEXT,
    "accessKeyId" TEXT,
    "encryptedSecretAccessKey" TEXT,
    "forcePathStyle" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectStorageSettings_pkey" PRIMARY KEY ("id")
);
