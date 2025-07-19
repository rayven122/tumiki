import { db } from "@tumiki/db/tcp";
import { logger } from "./logger.js";

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
  try {
    await db.securityLog.create({
      data: {
        eventType,
        apiKey: details.apiKey ? "***" : undefined, // APIキーはマスク
        clientId: details.clientId,
        sessionId: details.sessionId,
        userAgent: details.userAgent,
        ipAddress: details.ipAddress,
        errorMessage: details.errorMessage,
        organizationId: details.organizationId,
        createdAt: new Date(),
      },
    });

    // 重要なセキュリティイベントは即座にローカルログにも出力
    logger.error("Security event recorded", {
      eventType,
      clientId: details.clientId,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress,
    });
  } catch (error) {
    // DB書き込み失敗時もローカルログは確実に出力
    logger.error("Failed to log security event to DB", {
      eventType,
      error: error instanceof Error ? error.message : String(error),
      clientId: details.clientId,
      sessionId: details.sessionId,
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
  try {
    await db.operationalLog.create({
      data: {
        eventType,
        message: details.message,
        errorMessage: details.errorMessage,
        severity: details.severity || "medium",
        metadata: details.metadata
          ? JSON.stringify(details.metadata)
          : undefined,
        createdAt: new Date(),
      },
    });

    // 重要度がhigh以上の場合はローカルログにも出力
    if (details.severity === "high" || details.severity === "critical") {
      logger.error("Critical operational event", {
        eventType,
        message: details.message,
        severity: details.severity,
      });
    }
  } catch (error) {
    // DB書き込み失敗時もローカルログは確実に出力
    logger.error("Failed to log operational event to DB", {
      eventType,
      message: details.message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
