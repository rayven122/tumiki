import { cleanupExpiredSessions } from "../utils/session.js";
import { config } from "../libs/config.js";
import { logger } from "../libs/logger.js";
import { cleanupOldSecurityLogs } from "../libs/securityLogger.js";

/**
 * 定期的なメンテナンスタスクを開始
 */
export const startMaintenanceTasks = (): void => {
  const intervalMs = config.timeouts.connection / 2;
  const dailyCleanupMs = 24 * 60 * 60 * 1000; // 24時間

  logger.info("Starting maintenance tasks for dual transport support", {
    cleanupIntervalMs: intervalMs,
    dailyCleanupMs,
  });

  // 定期的な期限切れセッションのクリーンアップ
  setInterval(() => {
    cleanupExpiredSessions();
  }, intervalMs);

  // 1日に1回古いセキュリティログをクリーンアップ
  setInterval(() => {
    cleanupOldSecurityLogs().catch((error) => {
      logger.error("Failed to cleanup old security logs", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, dailyCleanupMs);
};
