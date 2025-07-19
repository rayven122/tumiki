import { logger } from "./logger.js";

// メモリ内セキュリティログキャッシュ（容量制限付き）
const securityLogsCache = new Map<
  string,
  {
    timestamp: Date;
    eventType: string;
    details: Record<string, unknown>;
  }
>();

const MAX_CACHE_SIZE = 1000; // 最大1000件のログを保持

/**
 * セキュリティ関連のログをDBに記録する
 */
export const logSecurityEvent = async (
  eventType:
    | "auth_failure"
    | "invalid_api_key"
    | "session_anomaly"
    | "suspicious_activity",
  details: {
    apiKey?: string;
    clientId?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    errorMessage?: string;
    organizationId?: string;
  },
): Promise<void> => {
  // セキュリティイベントをローカルログに出力
  logger.error("Security event recorded", {
    eventType,
    clientId: details.clientId,
    sessionId: details.sessionId,
    ipAddress: details.ipAddress,
    errorMessage: details.errorMessage,
  });

  // メモリ内キャッシュに保存（DB代替）
  const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  securityLogsCache.set(logId, {
    timestamp: new Date(),
    eventType,
    details: { ...details, apiKey: undefined }, // APIキーは保存しない
  });

  // キャッシュサイズ制限チェック
  if (securityLogsCache.size > MAX_CACHE_SIZE) {
    // 古いエントリを削除
    const entries = Array.from(securityLogsCache.entries()).sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const entriesToDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    entriesToDelete.forEach(([key]) => securityLogsCache.delete(key));
  }
};

/**
 * 古いセキュリティログを削除する関数
 */
export const cleanupOldSecurityLogs = async (): Promise<void> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let deletedCount = 0;
  for (const [key, logEntry] of securityLogsCache.entries()) {
    if (logEntry.timestamp < thirtyDaysAgo) {
      securityLogsCache.delete(key);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    logger.info("Cleaned up old security logs", {
      deletedCount,
      remainingCount: securityLogsCache.size,
      cutoffDate: thirtyDaysAgo.toISOString(),
    });
  }
};

/**
 * 運用監視用のログをDBに記録する
 */
export const logOperationalEvent = async (
  eventType:
    | "server_start"
    | "server_stop"
    | "critical_error"
    | "resource_shortage",
  details: {
    message: string;
    errorMessage?: string;
    severity?: "low" | "medium" | "high" | "critical";
    metadata?: Record<string, unknown>;
  },
): Promise<void> => {
  // 運用イベントをローカルログに出力
  if (details.severity === "high" || details.severity === "critical") {
    logger.error("Critical operational event", {
      eventType,
      message: details.message,
      severity: details.severity,
      metadata: details.metadata,
    });
  } else {
    logger.info("Operational event", {
      eventType,
      message: details.message,
      severity: details.severity,
      metadata: details.metadata,
    });
  }
};
