ALTER TABLE "DesktopAuditLog" ADD COLUMN "connectionName" VARCHAR(255);
ALTER TABLE "DesktopAuditLog" ADD COLUMN "clientName" VARCHAR(100);
ALTER TABLE "DesktopAuditLog" ADD COLUMN "clientVersion" VARCHAR(50);
ALTER TABLE "DesktopAuditLog" ADD COLUMN "transportType" VARCHAR(32);

CREATE INDEX "DesktopAuditLog_clientName_occurredAt_idx" ON "DesktopAuditLog"("clientName", "occurredAt");
CREATE INDEX "DesktopAuditLog_connectionName_occurredAt_idx" ON "DesktopAuditLog"("connectionName", "occurredAt");
