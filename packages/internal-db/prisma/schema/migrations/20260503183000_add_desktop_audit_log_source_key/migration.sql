-- Desktop監査ログ受信を冪等化するための送信元キーを追加する。
-- 既存行はNULLのまま残し、新規のDesktop同期リクエストでは両方の値を必須にする。
ALTER TABLE "DesktopAuditLog" ADD COLUMN "sourceInstallationId" TEXT;
ALTER TABLE "DesktopAuditLog" ADD COLUMN "sourceAuditLogId" INTEGER;

CREATE UNIQUE INDEX "DesktopAuditLog_sourceInstallationId_sourceAuditLogId_key"
  ON "DesktopAuditLog"("sourceInstallationId", "sourceAuditLogId");
