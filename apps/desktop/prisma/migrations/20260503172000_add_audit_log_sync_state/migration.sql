-- ローカル監査ログに管理サーバー同期状態を追加する。
ALTER TABLE "AuditLog" ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "AuditLog" ADD COLUMN "syncedAt" DATETIME;
ALTER TABLE "AuditLog" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AuditLog" ADD COLUMN "lastSyncTriedAt" DATETIME;

CREATE INDEX "AuditLog_syncStatus_createdAt_idx" ON "AuditLog"("syncStatus", "createdAt");
