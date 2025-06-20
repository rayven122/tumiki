import { detectInactiveConnections } from "../../core/connection/connectionManager.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

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
