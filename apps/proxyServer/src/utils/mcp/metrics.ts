import { logger } from "../../libs/logger.js";
import { config } from "../../libs/config.js";

/**
 * プール使用統計
 */
export type PoolMetrics = {
  /** 合計接続数 */
  totalConnections: number;
  /** アクティブ接続数 */
  activeConnections: number;
  /** アイドル接続数 */
  idleConnections: number;
  /** プール数 */
  poolCount: number;
  /** 接続成功回数 */
  connectionSuccesses: number;
  /** 接続失敗回数 */
  connectionFailures: number;
  /** 操作成功回数 */
  operationSuccesses: number;
  /** 操作失敗回数 */
  operationFailures: number;
  /** 平均操作時間（ミリ秒） */
  avgOperationTimeMs: number;
};

/**
 * メトリクス収集クラス
 */
class MCPMetricsCollector {
  private connectionSuccesses = 0;
  private connectionFailures = 0;
  private operationSuccesses = 0;
  private operationFailures = 0;
  private operationTimes: number[] = [];
  private metricsTimer: NodeJS.Timeout | undefined;

  /**
   * メトリクス収集を開始
   */
  start(): void {
    if (!config.metrics.enabled || this.metricsTimer) {
      return;
    }

    this.metricsTimer = setInterval(() => {
      this.logMetrics();
    }, config.metrics.interval);

    // Node.jsプロセス終了を妨げないように
    this.metricsTimer.unref?.();

    logger.info("MCP metrics collection started", {
      interval: config.metrics.interval,
    });
  }

  /**
   * メトリクス収集を停止
   */
  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
      logger.info("MCP metrics collection stopped");
    }
  }

  /**
   * 接続成功を記録
   */
  recordConnectionSuccess(): void {
    this.connectionSuccesses++;
  }

  /**
   * 接続失敗を記録
   */
  recordConnectionFailure(): void {
    this.connectionFailures++;
  }

  /**
   * 操作成功を記録
   *
   * @param durationMs - 操作時間（ミリ秒）
   */
  recordOperationSuccess(durationMs: number): void {
    this.operationSuccesses++;
    this.addOperationTime(durationMs);
  }

  /**
   * 操作失敗を記録
   *
   * @param durationMs - 操作時間（ミリ秒）
   */
  recordOperationFailure(durationMs: number): void {
    this.operationFailures++;
    this.addOperationTime(durationMs);
  }

  /**
   * 操作時間を記録（最新100件まで保持）
   */
  private addOperationTime(durationMs: number): void {
    this.operationTimes.push(durationMs);
    if (this.operationTimes.length > 100) {
      this.operationTimes.shift();
    }
  }

  /**
   * 平均操作時間を計算
   */
  private getAvgOperationTime(): number {
    if (this.operationTimes.length === 0) return 0;
    const total = this.operationTimes.reduce((sum, time) => sum + time, 0);
    return Math.round(total / this.operationTimes.length);
  }

  /**
   * 現在のプールメトリクスを取得
   *
   * @param connectionPools - 接続プールのMap
   */
  getPoolMetrics(
    connectionPools: Map<string, Array<{ isActive: boolean }>>,
  ): PoolMetrics {
    let totalConnections = 0;
    let activeConnections = 0;
    let idleConnections = 0;

    for (const pool of connectionPools.values()) {
      totalConnections += pool.length;
      for (const connection of pool) {
        if (connection.isActive) {
          activeConnections++;
        } else {
          idleConnections++;
        }
      }
    }

    return {
      totalConnections,
      activeConnections,
      idleConnections,
      poolCount: connectionPools.size,
      connectionSuccesses: this.connectionSuccesses,
      connectionFailures: this.connectionFailures,
      operationSuccesses: this.operationSuccesses,
      operationFailures: this.operationFailures,
      avgOperationTimeMs: this.getAvgOperationTime(),
    };
  }

  /**
   * メトリクスをログ出力
   */
  private logMetrics(): void {
    // この実装では外部からconnectionPoolsにアクセスできないため
    // 基本的な統計情報のみをログ出力
    const stats = {
      connectionSuccesses: this.connectionSuccesses,
      connectionFailures: this.connectionFailures,
      connectionSuccessRate:
        this.connectionSuccesses + this.connectionFailures > 0
          ? Math.round(
              (this.connectionSuccesses /
                (this.connectionSuccesses + this.connectionFailures)) *
                100,
            )
          : 0,
      operationSuccesses: this.operationSuccesses,
      operationFailures: this.operationFailures,
      operationSuccessRate:
        this.operationSuccesses + this.operationFailures > 0
          ? Math.round(
              (this.operationSuccesses /
                (this.operationSuccesses + this.operationFailures)) *
                100,
            )
          : 0,
      avgOperationTimeMs: this.getAvgOperationTime(),
    };

    logger.info("MCP Pool Metrics", stats);
  }

  /**
   * メトリクス統計をリセット
   */
  resetStats(): void {
    this.connectionSuccesses = 0;
    this.connectionFailures = 0;
    this.operationSuccesses = 0;
    this.operationFailures = 0;
    this.operationTimes = [];
    logger.debug("MCP metrics stats reset");
  }
}

// グローバルメトリクスコレクター
export const metricsCollector = new MCPMetricsCollector();

/**
 * 操作時間を測定するヘルパー関数
 */
export const measureOperationTime = async <T>(
  operation: () => Promise<T>,
  onSuccess?: (durationMs: number) => void,
  onFailure?: (durationMs: number) => void,
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    onSuccess?.(duration);
    metricsCollector.recordOperationSuccess(duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    onFailure?.(duration);
    metricsCollector.recordOperationFailure(duration);
    throw error;
  }
};
