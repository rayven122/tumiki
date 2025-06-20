import { detectInactiveConnections } from "../services/connection.js";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

/**
 * 定期的なメンテナンスタスクを開始
 */
export const startMaintenanceTasks = (): void => {
  const intervalMs = config.timeouts.connection / 2;

  logger.info("Starting maintenance tasks", {
    cleanupIntervalMs: intervalMs,
  });

  // 定期的な非アクティブ接続のクリーンアップ
  setInterval(() => {
    detectInactiveConnections();
  }, intervalMs);
};
