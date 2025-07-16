import { cleanupExpiredSessions, getSessionStats } from "../utils/session.js";
import { config } from "../libs/config.js";
import { logger } from "../libs/logger.js";

/**
 * 定期的なメンテナンスタスクを開始
 */
export const startMaintenanceTasks = (): void => {
  const intervalMs = config.timeouts.connection / 2;

  logger.info("Starting maintenance tasks for dual transport support", {
    cleanupIntervalMs: intervalMs,
  });

  // 定期的な期限切れセッションのクリーンアップ
  setInterval(() => {
    cleanupExpiredSessions();

    // メトリクスログ出力（デバッグ用）
    const stats = getSessionStats();
    if (stats.totalSessions > 0) {
      logger.debug("Session statistics", stats);
    }
  }, intervalMs);
};
