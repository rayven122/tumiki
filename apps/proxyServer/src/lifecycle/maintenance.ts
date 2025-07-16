import {
  cleanupExpiredSessions,
  getSessionStats,
} from "../services/session.js";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

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

    // デバッグログを削除（メモリ使用量削減）
  }, intervalMs);
};
