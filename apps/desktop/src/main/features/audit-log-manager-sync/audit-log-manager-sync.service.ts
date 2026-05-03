import { randomUUID } from "crypto";
import { AuditLogSyncStatus } from "@prisma/desktop-client";
import type { AuditLog } from "@prisma/desktop-client";
import { postManagerApi } from "../../shared/manager-api-client";
import { getDb } from "../../shared/db";
import { getAppStore } from "../../shared/app-store";
import * as logger from "../../shared/utils/logger";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const POST_TIMEOUT_MS = 10_000;
const SYNC_BATCH_SIZE = 100;
const MAX_SYNC_RETRY_COUNT = 10;

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let currentSyncPromise: Promise<SyncResult> | null = null;

const toOccurredAt = (value: AuditLog["createdAt"]): string => {
  return value.toISOString();
};

const toInteger = (value: number | null | undefined, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return fallback;
};

type RemoteAuditLogEntry = {
  sourceAuditLogId: number;
  mcpServerId: string;
  toolName: string;
  method: string;
  httpStatus: number;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  errorCode?: number;
  errorSummary?: string;
  occurredAt: string;
};

const buildRemoteLog = (log: AuditLog): RemoteAuditLogEntry => ({
  sourceAuditLogId: log.id,
  mcpServerId: String(log.serverId),
  toolName: String(log.toolName).slice(0, 255),
  method: String(log.method).slice(0, 64),
  httpStatus: log.isSuccess === false ? 500 : 200,
  durationMs: toInteger(log.durationMs),
  inputBytes: toInteger(log.inputBytes),
  outputBytes: toInteger(log.outputBytes),
  errorCode:
    log.errorCode === null || log.errorCode === undefined
      ? undefined
      : toInteger(log.errorCode),
  errorSummary:
    log.errorSummary === null || log.errorSummary === undefined
      ? undefined
      : String(log.errorSummary).slice(0, 500),
  occurredAt: toOccurredAt(log.createdAt),
});

const getInstallationId = async (): Promise<string> => {
  const store = await getAppStore();
  const existing = store.get("installationId");
  if (existing) return existing;

  const installationId = randomUUID();
  store.set("installationId", installationId);
  return installationId;
};

const warnIfMaxRetryExceeded = async (
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<void> => {
  const abandonedCount = await db.auditLog.count({
    where: {
      syncStatus: AuditLogSyncStatus.FAILED,
      retryCount: { gte: MAX_SYNC_RETRY_COUNT },
    },
  });
  if (abandonedCount > 0) {
    logger.warn("Audit logs excluded from manager sync after max retries", {
      abandonedCount,
    });
  }
};

type SyncResult = {
  attempted: number;
  synced: number;
  failed: number;
  skipped: boolean;
};

// Manager連携済みの場合、未同期のローカル監査ログをベストエフォートで送信する。
export const syncPendingAuditLogsToManager = (): Promise<SyncResult> => {
  if (isSyncing) {
    return Promise.resolve({
      attempted: 0,
      synced: 0,
      failed: 0,
      skipped: true,
    });
  }

  isSyncing = true;
  let selectedLogs: AuditLog[] = [];
  let db: Awaited<ReturnType<typeof getDb>> | null = null;

  const syncPromise = (async (): Promise<SyncResult> => {
    try {
      db = await getDb();
      selectedLogs = await db.auditLog.findMany({
        where: {
          syncStatus: {
            in: [AuditLogSyncStatus.PENDING, AuditLogSyncStatus.FAILED],
          },
          retryCount: { lt: MAX_SYNC_RETRY_COUNT },
        },
        orderBy: { createdAt: "asc" },
        take: SYNC_BATCH_SIZE,
      });
      try {
        await warnIfMaxRetryExceeded(db);
      } catch (warningError) {
        logger.warn("Failed to count audit logs excluded from manager sync", {
          error:
            warningError instanceof Error
              ? warningError.message
              : String(warningError),
        });
      }

      if (selectedLogs.length === 0) {
        return { attempted: 0, synced: 0, failed: 0, skipped: false };
      }

      const installationId = await getInstallationId();
      const response = await postManagerApi(
        "/api/internal/audit-logs",
        {
          logs: selectedLogs.map((log) => ({
            sourceInstallationId: installationId,
            ...buildRemoteLog(log),
          })),
        },
        {
          signal: AbortSignal.timeout(POST_TIMEOUT_MS),
        },
      );
      if (!response) {
        return { attempted: 0, synced: 0, failed: 0, skipped: true };
      }

      const now = new Date();
      const ids = selectedLogs.map((log) => log.id);

      if (!response.ok) {
        logger.warn("Failed to sync audit log to manager", {
          status: response.status,
        });
        await db.auditLog.updateMany({
          where: { id: { in: ids } },
          data: {
            syncStatus: AuditLogSyncStatus.FAILED,
            lastSyncTriedAt: now,
            retryCount: { increment: 1 },
          },
        });
        return {
          attempted: selectedLogs.length,
          synced: 0,
          failed: selectedLogs.length,
          skipped: false,
        };
      }

      await db.auditLog.updateMany({
        where: { id: { in: ids } },
        data: {
          syncStatus: AuditLogSyncStatus.SYNCED,
          syncedAt: now,
          lastSyncTriedAt: now,
        },
      });

      return {
        attempted: selectedLogs.length,
        synced: selectedLogs.length,
        failed: 0,
        skipped: false,
      };
    } catch (error) {
      logger.warn("Failed to sync audit log to manager", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (selectedLogs.length > 0) {
        try {
          const updateDb = db ?? (await getDb());
          await updateDb.auditLog.updateMany({
            where: { id: { in: selectedLogs.map((log) => log.id) } },
            data: {
              syncStatus: AuditLogSyncStatus.FAILED,
              lastSyncTriedAt: new Date(),
              retryCount: { increment: 1 },
            },
          });
        } catch (updateError) {
          logger.warn("Failed to update audit log sync failure state", {
            error:
              updateError instanceof Error
                ? updateError.message
                : String(updateError),
          });
        }
        return {
          attempted: selectedLogs.length,
          synced: 0,
          failed: selectedLogs.length,
          skipped: false,
        };
      }
      return { attempted: 0, synced: 0, failed: 0, skipped: true };
    } finally {
      isSyncing = false;
      currentSyncPromise = null;
    }
  })();
  currentSyncPromise = syncPromise;
  return syncPromise;
};

export const startAuditLogManagerSyncScheduler = (): void => {
  if (syncTimer) return;

  void syncPendingAuditLogsToManager();
  syncTimer = setInterval(() => {
    void syncPendingAuditLogsToManager();
  }, SYNC_INTERVAL_MS);
};

export const stopAuditLogManagerSyncScheduler = async (): Promise<void> => {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  await currentSyncPromise?.catch(() => undefined);
};
