import {
  detectInactiveConnections,
  CONNECTION_TIMEOUT,
} from "../connection/connectionManager.js";
import { logSystemHealth } from "../monitoring/healthMonitor.js";

/**
 * 定期的なメンテナンスタスクを開始
 */
export const startMaintenanceTasks = (): void => {
  // 定期的なメンテナンスタスク
  setInterval(() => {
    // 非アクティブ接続のクリーンアップ
    detectInactiveConnections();
  }, CONNECTION_TIMEOUT / 2);

  // システムヘルスチェックの定期実行（5分ごと）
  setInterval(
    () => {
      logSystemHealth();
    },
    5 * 60 * 1000,
  );
};
