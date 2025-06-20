import { startMetricsCollection } from "../utils/metrics.js";
import { startRecoveryManager } from "../../core/connection/recoveryManager.js";
import { startMaintenanceTasks } from "./maintenance.js";
import { setupShutdownHandlers } from "./shutdown.js";
import { logger } from "../utils/logger.js";

/**
 * アプリケーション初期化処理を集約
 */
export const initializeApplication = (): void => {
  logger.info("Initializing application components...");

  // 回復マネージャーを開始
  startRecoveryManager();
  logger.info("Recovery manager started");

  // メンテナンスタスクを開始
  startMaintenanceTasks();
  logger.info("Maintenance tasks started");

  // メトリクス収集を開始
  startMetricsCollection();
  logger.info("Metrics collection started");

  // シャットダウンハンドラーを設定
  setupShutdownHandlers();
  logger.info("Shutdown handlers configured");

  logger.info("Application initialization completed");
};
