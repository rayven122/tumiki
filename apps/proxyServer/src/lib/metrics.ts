import { logger } from "./logger.js";
import { config } from "./config.js";
import { getSessionStats } from "../services/session.js";
import { getStreamableConnectionStats } from "../services/transport.js";
import { getSSEConnectionStats } from "../services/connection.js";
import { getSSEConnectionPool } from "../services/proxy.js";

// Transport別メトリクス
export interface TransportMetrics {
  requestCount: number;
  successfulRequests: number;
  failedRequests: number;
  responseTimes: number[];
  errorCount: number;
  errorTypes: Record<string, number>;
  connectionCount: number;
  lastActivity: number;
}

interface MetricsData {
  timestamp: string;
  sessions: {
    total: number;
    active: number;
    sse: number;
    streamableHttp: number;
  };
  connections: {
    sse: {
      total: number;
      active: number;
    };
    streamableHttp: {
      total: number;
      active: number;
    };
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
    // Transport別パフォーマンス
    byTransport: {
      sse: {
        averageResponseTime: number;
        errorRate: number;
        requestCount: number;
      };
      streamableHttp: {
        averageResponseTime: number;
        errorRate: number;
        requestCount: number;
      };
    };
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

// Transport別メトリクス状態
const transportMetrics = {
  sse: {
    requestCount: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [] as number[],
    errorCount: 0,
    errorTypes: {} as Record<string, number>,
    connectionCount: 0,
    lastActivity: Date.now(),
  } as TransportMetrics,
  streamableHttp: {
    requestCount: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [] as number[],
    errorCount: 0,
    errorTypes: {} as Record<string, number>,
    connectionCount: 0,
    lastActivity: Date.now(),
  } as TransportMetrics,
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

// Transport別リクエストメトリクス記録
export const recordTransportRequest = (
  transportType: "sse" | "streamableHttp",
  success: boolean,
  responseTime: number,
): void => {
  const metrics = transportMetrics[transportType];
  metrics.requestCount++;
  metrics.lastActivity = Date.now();

  if (success) {
    metrics.successfulRequests++;
  } else {
    metrics.failedRequests++;
  }
  metrics.responseTimes.push(responseTime);

  // 全体メトリクスにも記録
  recordRequest(success, responseTime);
};

// エラー関連のメトリクス記録
export const recordError = (errorType: string): void => {
  metricsState.errorCount++;
  metricsState.errorTypes[errorType] =
    (metricsState.errorTypes[errorType] || 0) + 1;
};

// Transport別エラーメトリクス記録
export const recordTransportError = (
  transportType: "sse" | "streamableHttp",
  errorType: string,
): void => {
  const metrics = transportMetrics[transportType];
  metrics.errorCount++;
  metrics.errorTypes[errorType] = (metrics.errorTypes[errorType] || 0) + 1;

  // 全体メトリクスにも記録
  recordError(`${transportType}_${errorType}`);
};

// Transport別接続数更新
export const updateTransportConnectionCount = (
  transportType: "sse" | "streamableHttp",
  count: number,
): void => {
  transportMetrics[transportType].connectionCount = count;
  transportMetrics[transportType].lastActivity = Date.now();
};

// Transport別メトリクス計算ヘルパー
const calculateTransportMetrics = (metrics: TransportMetrics) => {
  const errorRate =
    metrics.requestCount > 0
      ? (metrics.failedRequests / metrics.requestCount) * 100
      : 0;

  const avgResponseTime =
    metrics.responseTimes.length > 0
      ? metrics.responseTimes.reduce((sum, time) => sum + time, 0) /
        metrics.responseTimes.length
      : 0;

  return {
    averageResponseTime: Math.round(avgResponseTime * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    requestCount: metrics.requestCount,
  };
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

  // セッション統計を取得
  const sessionStats = getSessionStats();
  const sseStats = getSSEConnectionStats();
  const streamableStats = getStreamableConnectionStats();

  // Transport別メトリクスを更新
  updateTransportConnectionCount("sse", sseStats.totalConnections);
  updateTransportConnectionCount(
    "streamableHttp",
    streamableStats.totalConnections,
  );

  return {
    timestamp: new Date().toISOString(),
    sessions: {
      total: sessionStats.totalSessions,
      active: sessionStats.activeSessions,
      sse: sessionStats.sse,
      streamableHttp: sessionStats.streamableHttp,
    },
    connections: {
      sse: {
        total: sseStats.totalConnections,
        active: sseStats.activeConnections,
      },
      streamableHttp: {
        total: streamableStats.totalConnections,
        active: streamableStats.activeConnections,
      },
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
      byTransport: {
        sse: calculateTransportMetrics(transportMetrics.sse),
        streamableHttp: calculateTransportMetrics(
          transportMetrics.streamableHttp,
        ),
      },
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

  // Transport別メトリクスもリセット
  for (const transportType of ["sse", "streamableHttp"] as const) {
    const metrics = transportMetrics[transportType];
    metrics.requestCount = 0;
    metrics.successfulRequests = 0;
    metrics.failedRequests = 0;
    metrics.responseTimes = [];
    metrics.errorCount = 0;
    metrics.errorTypes = {};
    // connectionCountとlastActivityはリセットしない
  }
};

// Transport別メトリクスを取得
export const getTransportMetrics = () => {
  return {
    sse: { ...transportMetrics.sse },
    streamableHttp: { ...transportMetrics.streamableHttp },
  };
};

// SSE接続プールの統計を取得する関数
const getPoolInfo = (): string => {
  try {
    const pool = getSSEConnectionPool();
    const poolStats = pool.getPoolStats();
    return `Pool: ${poolStats.activeConnections}/${poolStats.totalConnections}`;
  } catch {
    return "Pool: N/A";
  }
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

// Transport別実行時間測定
export const measureTransportExecutionTime = async <T>(
  operation: () => Promise<T>,
  transportType: "sse" | "streamableHttp",
  operationName: string,
): Promise<T> => {
  const startTime = Date.now();
  let success = false;

  try {
    const result = await operation();
    success = true;
    return result;
  } catch (error) {
    recordTransportError(transportType, operationName);
    throw error;
  } finally {
    const responseTime = Date.now() - startTime;
    recordTransportRequest(transportType, success, responseTime);
  }
};
