import { cleanupExpiredSessions } from "../utils/session.js";
import { config } from "../libs/config.js";
import { cleanupOldSecurityLogs } from "../libs/securityLogger.js";

/**
 * 定期的なメンテナンスタスクを開始
 */
export const startMaintenanceTasks = (): void => {
  const intervalMs = config.timeouts.connection / 2;
  const dailyCleanupMs = 24 * 60 * 60 * 1000; // 24時間

  // 定期的な期限切れセッションのクリーンアップ
  setInterval(() => {
    void cleanupExpiredSessions();
  }, intervalMs);

  // 1日に1回古いセキュリティログをクリーンアップ
  setInterval(() => {
    void cleanupOldSecurityLogs();
  }, dailyCleanupMs);
};
