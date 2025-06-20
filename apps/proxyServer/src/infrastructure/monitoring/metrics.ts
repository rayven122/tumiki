import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { connections } from "../../core/connection/connectionManager.js";
import { getPoolInfo } from "./pool.js";

interface MetricsData {
  timestamp: string;
  connections: {
    active: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    errorRate: number;
  };
  performance: {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  };
  errors: {
    count: number;
    types: Record<string, number>;
  };
  system: {
    memoryUsage: {
      rss: number;
      heap: number;
    };
    poolInfo: string;
  };
}

// メトリクス状態を保持するオブジェクト
const metricsState = {
  requestCount: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [] as number[],
  errorCount: 0,
  errorTypes: {} as Record<string, number>,
  interval: null as NodeJS.Timeout | null,
};

// メトリクス収集開始
export const startMetricsCollection = (): void => {
  if (config.metrics.enabled && !metricsState.interval) {
    metricsState.interval = setInterval(() => {
      const metrics = collectMetrics();
      logger.info("Metrics and health report", { metrics });
      resetMetrics();
    }, config.metrics.interval);
  }
};

// メトリクス収集停止
export const stopMetricsCollection = (): void => {
  if (metricsState.interval) {
    clearInterval(metricsState.interval);
    metricsState.interval = null;
  }
};

// リクエスト関連のメトリクス記録
export const recordRequest = (success: boolean, responseTime: number): void => {
  metricsState.requestCount++;
  if (success) {
    metricsState.successfulRequests++;
  } else {
    metricsState.failedRequests++;
  }
  metricsState.responseTimes.push(responseTime);
};

// エラー関連のメトリクス記録
export const recordError = (errorType: string): void => {
  metricsState.errorCount++;
  metricsState.errorTypes[errorType] =
    (metricsState.errorTypes[errorType] || 0) + 1;
};

// 現在のメトリクスデータを収集
export const collectMetrics = (): MetricsData => {
  const errorRate =
    metricsState.requestCount > 0
      ? (metricsState.failedRequests / metricsState.requestCount) * 100
      : 0;

  const avgResponseTime =
    metricsState.responseTimes.length > 0
      ? metricsState.responseTimes.reduce((sum, time) => sum + time, 0) /
        metricsState.responseTimes.length
      : 0;

  // システム情報の取得
  const memUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heap: Math.round(memUsage.heapUsed / 1024 / 1024),
  };

  return {
    timestamp: new Date().toISOString(),
    connections: {
      active: connections.size,
    },
    requests: {
      total: metricsState.requestCount,
      successful: metricsState.successfulRequests,
      failed: metricsState.failedRequests,
      errorRate: Math.round(errorRate * 100) / 100,
    },
    performance: {
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      maxResponseTime:
        metricsState.responseTimes.length > 0
          ? Math.max(...metricsState.responseTimes)
          : 0,
      minResponseTime:
        metricsState.responseTimes.length > 0
          ? Math.min(...metricsState.responseTimes)
          : 0,
    },
    errors: {
      count: metricsState.errorCount,
      types: { ...metricsState.errorTypes },
    },
    system: {
      memoryUsage: memoryMB,
      poolInfo: getPoolInfo(),
    },
  };
};

// メトリクスのリセット（定期レポート後）
const resetMetrics = (): void => {
  metricsState.requestCount = 0;
  metricsState.successfulRequests = 0;
  metricsState.failedRequests = 0;
  metricsState.responseTimes = [];
  metricsState.errorCount = 0;
  metricsState.errorTypes = {};
};

// ヘルパー関数：実行時間を測定してメトリクスを記録
export const measureExecutionTime = async <T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> => {
  const startTime = Date.now();
  let success = false;

  try {
    const result = await operation();
    success = true;
    return result;
  } catch (error) {
    recordError(operationName);
    throw error;
  } finally {
    const responseTime = Date.now() - startTime;
    recordRequest(success, responseTime);
  }
};
