import {
  connections,
  cleanupConnection,
  CONNECTION_TIMEOUT,
} from "./connectionManager.js";
import { logger } from "../../infrastructure/utils/logger.js";

// 回復設定
export const RECOVERY_CONFIG = {
  /**
   * 接続の回復を試みる最大回数
   */
  MAX_RETRY_ATTEMPTS: 3,
  /**
   * 接続の回復を試みる間隔
   */
  BASE_RETRY_DELAY: 1000, // 1秒
  /**
   * 接続の回復を試みる最大遅延
   */
  MAX_RETRY_DELAY: 30000, // 30秒
  /**
   * ヘルスチェックの間隔
   */
  HEALTH_CHECK_INTERVAL: 15000, // 15秒
  /**
   * 接続の回復に失敗した場合のクリーンアップ遅延
   */
  CONNECTION_GRACE_PERIOD: 5000, // 5秒
} as const;

// 接続状態の列挙
export enum ConnectionState {
  /**
   * 接続が正常
   */
  HEALTHY = "healthy",
  /**
   * 接続が劣化している（タイムアウトの80%を超えた）
   */
  DEGRADED = "degraded",
  /**
   * 接続が失敗している
   */
  FAILED = "failed",
  /**
   * 接続が回復中
   */
  RECOVERING = "recovering",
}

// 回復統計
interface RecoveryStats {
  sessionId: string;
  retryCount: number;
  lastRetryTime: number;
  state: ConnectionState;
  consecutiveFailures: number;
}

// 回復管理
const recoveryStats = new Map<string, RecoveryStats>();

/**
 * 指数バックオフによる遅延計算
 */
const calculateBackoffDelay = (attempt: number): number => {
  const delay = RECOVERY_CONFIG.BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
  return Math.min(delay, RECOVERY_CONFIG.MAX_RETRY_DELAY);
};

/**
 * 接続のヘルスチェック
 */
export const checkConnectionHealth = (sessionId: string): ConnectionState => {
  const connection = connections.get(sessionId);
  if (!connection) {
    return ConnectionState.FAILED;
  }

  const now = Date.now();
  const timeSinceActivity = now - connection.lastActivity;

  // タイムアウトチェック
  if (timeSinceActivity > CONNECTION_TIMEOUT) {
    return ConnectionState.FAILED;
  }

  // 劣化状態チェック（タイムアウトの80%）
  if (timeSinceActivity > CONNECTION_TIMEOUT * 0.8) {
    return ConnectionState.DEGRADED;
  }

  return ConnectionState.HEALTHY;
};

/**
 * 接続回復の試行
 */
export const attemptConnectionRecovery = async (
  sessionId: string,
  recoveryCallback: () => Promise<boolean>,
): Promise<boolean> => {
  let stats = recoveryStats.get(sessionId);

  if (!stats) {
    stats = {
      sessionId,
      retryCount: 0,
      lastRetryTime: 0,
      state: ConnectionState.FAILED,
      consecutiveFailures: 0,
    };
    recoveryStats.set(sessionId, stats);
  }

  // 最大リトライ回数チェック
  if (stats.retryCount >= RECOVERY_CONFIG.MAX_RETRY_ATTEMPTS) {
    console.warn(`Max recovery attempts reached for session ${sessionId}`);
    stats.state = ConnectionState.FAILED;
    return false;
  }

  // バックオフ遅延の適用
  const now = Date.now();
  const timeSinceLastRetry = now - stats.lastRetryTime;
  const requiredDelay = calculateBackoffDelay(stats.retryCount + 1);

  if (timeSinceLastRetry < requiredDelay) {
    console.log(
      `Recovery for ${sessionId} delayed by ${requiredDelay - timeSinceLastRetry}ms`,
    );
    return false;
  }

  stats.retryCount++;
  stats.lastRetryTime = now;
  stats.state = ConnectionState.RECOVERING;

  try {
    console.log(
      `Attempting recovery for session ${sessionId} (attempt ${stats.retryCount}/${RECOVERY_CONFIG.MAX_RETRY_ATTEMPTS})`,
    );

    const recoverySuccessful = await recoveryCallback();

    if (recoverySuccessful) {
      console.log(`Recovery successful for session ${sessionId}`);
      stats.state = ConnectionState.HEALTHY;
      stats.consecutiveFailures = 0;
      // 成功時はリトライカウントをリセット
      stats.retryCount = 0;
      return true;
    } else {
      console.warn(`Recovery failed for session ${sessionId}`);
      stats.state = ConnectionState.FAILED;
      stats.consecutiveFailures++;
      return false;
    }
  } catch (error) {
    console.error(`Recovery attempt failed for session ${sessionId}:`, error);
    stats.state = ConnectionState.FAILED;
    stats.consecutiveFailures++;
    return false;
  }
};

/**
 * 失敗した接続のクリーンアップ
 */
export const cleanupFailedConnection = async (
  sessionId: string,
): Promise<void> => {
  console.log(`Cleaning up failed connection: ${sessionId}`);

  // 回復統計を削除
  recoveryStats.delete(sessionId);

  // 接続をクリーンアップ
  await cleanupConnection(sessionId);
};

/**
 * 回復統計の取得
 */
export const getRecoveryStats = (
  sessionId: string,
): RecoveryStats | undefined => {
  return recoveryStats.get(sessionId);
};

/**
 * 全体的な回復統計の取得
 */
export const getAllRecoveryStats = (): Record<string, RecoveryStats> => {
  return Object.fromEntries(recoveryStats.entries());
};

/**
 * 定期的なヘルスチェックの開始
 */
export const startHealthMonitoring = (): NodeJS.Timeout => {
  return setInterval(() => {
    const unhealthyConnections: string[] = [];

    for (const [sessionId] of connections) {
      const health = checkConnectionHealth(sessionId);

      if (
        health === ConnectionState.FAILED ||
        health === ConnectionState.DEGRADED
      ) {
        unhealthyConnections.push(sessionId);
      }
    }

    if (unhealthyConnections.length > 0) {
      console.log(
        `Health check: Found ${unhealthyConnections.length} unhealthy connections`,
        unhealthyConnections,
      );
    }
  }, RECOVERY_CONFIG.HEALTH_CHECK_INTERVAL);
};

// 回復マネージャーの状態
let healthMonitoringTimer: NodeJS.Timeout | null = null;

/**
 * 回復マネージャーを開始
 */
export const startRecoveryManager = (): void => {
  if (healthMonitoringTimer === null) {
    logger.info("Starting connection recovery manager");
    healthMonitoringTimer = startHealthMonitoring();
  }
};

/**
 * 回復マネージャーを停止
 */
export const stopRecoveryManager = (): void => {
  if (healthMonitoringTimer !== null) {
    logger.info("Stopping connection recovery manager");
    clearInterval(healthMonitoringTimer);
    healthMonitoringTimer = null;

    // 回復統計をクリア
    recoveryStats.clear();
  }
};

/**
 * 回復マネージャーの初期化（後方互換性のために残す）
 * @deprecated startRecoveryManager() を使用してください
 */
export const initializeRecoveryManager = (): (() => void) => {
  startRecoveryManager();
  return stopRecoveryManager;
};
