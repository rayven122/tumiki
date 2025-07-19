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
  // セキュリティイベントをローカルログに出力
  logger.error("Security event recorded", {
    eventType,
    clientId: details.clientId,
    sessionId: details.sessionId,
    ipAddress: details.ipAddress,
    errorMessage: details.errorMessage,
  });
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
