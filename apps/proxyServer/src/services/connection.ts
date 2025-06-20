import { type Request, type Response } from "express";
import type { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SSEServerTransport as SSEServerTransportClass } from "@modelcontextprotocol/sdk/server/sse.js";
import { getServer } from "./proxy.js";
import { messageQueuePool } from "../lib/utils.js";
import { logger } from "../lib/logger.js";
import { config } from "../lib/config.js";

// SSE接続管理の設定
/** SSE接続のタイムアウト設定（ミリ秒） */
export const CONNECTION_TIMEOUT = config.timeouts.connection;
/** キープアライブの間隔（ミリ秒） */
export const KEEPALIVE_INTERVAL = config.timeouts.keepalive;

// 回復設定
export const RECOVERY_CONFIG = {
  /** 接続の回復を試みる最大回数 */
  MAX_RETRY_ATTEMPTS: 3,
  /** 接続の回復を試みる間隔 */
  BASE_RETRY_DELAY: 1000, // 1秒
  /** 接続の回復を試みる最大遅延 */
  MAX_RETRY_DELAY: 30000, // 30秒
  /** ヘルスチェックの間隔 */
  HEALTH_CHECK_INTERVAL: 15000, // 15秒
  /** 接続の回復に失敗した場合のクリーンアップ遅延 */
  CONNECTION_GRACE_PERIOD: 5000, // 5秒
} as const;

// 接続状態の列挙
export enum ConnectionState {
  /** 接続が正常 */
  HEALTHY = "healthy",
  /** 接続が劣化している（タイムアウトの80%を超えた） */
  DEGRADED = "degraded",
  /** 接続が失敗している */
  FAILED = "failed",
  /** 接続が回復中 */
  RECOVERING = "recovering",
}

// 接続状態管理
export interface ConnectionInfo {
  transport: SSEServerTransport;
  lastActivity: number;
  clientId: string;
  messageQueue: unknown[];
  isProcessing: boolean;
  keepAliveInterval?: NodeJS.Timeout;
  cleanup?: () => Promise<void>;
  // 回復機能用の追加フィールド
  connectionStartTime: number;
  lastHealthCheck: number;
  errorCount: number;
  apiKeyId?: string;
}

// 回復統計
interface RecoveryStats {
  sessionId: string;
  retryCount: number;
  lastRetryTime: number;
  state: ConnectionState;
  consecutiveFailures: number;
}

// 効率的な接続プール管理
export const connections = new Map<string, ConnectionInfo>();
// クライアントごとの接続数管理
export const clientConnections = new Map<string, Set<string>>();
// 回復管理
const recoveryStats = new Map<string, RecoveryStats>();

/**
 * 接続エラーの記録
 */
export const recordConnectionError = (
  sessionId: string,
  error: Error,
): void => {
  const connection = connections.get(sessionId);
  if (connection) {
    connection.errorCount++;
    logger.error("Connection error recorded", {
      sessionId,
      errorCount: connection.errorCount,
      error: error.message,
    });
  }
};

/**
 * 接続の健全性をチェック
 */
export const isConnectionHealthy = (sessionId: string): boolean => {
  const connection = connections.get(sessionId);
  if (!connection) return false;

  const now = Date.now();
  const timeSinceActivity = now - connection.lastActivity;

  return (
    timeSinceActivity <= CONNECTION_TIMEOUT &&
    connection.errorCount < config.connection.maxErrorCount
  );
};

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
 * 接続のクリーンアップ処理
 */
export const cleanupConnection = async (sessionId: string): Promise<void> => {
  try {
    const connection = connections.get(sessionId);
    if (!connection) {
      logger.warn("Connection not found for cleanup", { sessionId });
      return;
    }

    const connectionDuration = Date.now() - connection.connectionStartTime;
    logger.info("Cleaning up connection", {
      sessionId,
      durationSeconds: Math.round(connectionDuration / 1000),
      errorCount: connection.errorCount,
    });

    // キープアライブを停止
    if (connection.keepAliveInterval) {
      clearInterval(connection.keepAliveInterval);
    }

    // トランスポートをクローズ
    try {
      await connection.transport.close();
    } catch (error) {
      console.warn(`Error closing transport for ${sessionId}:`, error);
    }

    // クリーンアップ関数を実行
    if (connection.cleanup) {
      try {
        await connection.cleanup();
      } catch (error) {
        console.warn(`Error during cleanup for ${sessionId}:`, error);
      }
    }

    // メッセージキューをプールに戻す
    messageQueuePool.release(connection.messageQueue);

    // クライアント接続数管理から削除
    const clientConns = clientConnections.get(connection.clientId);
    if (clientConns) {
      clientConns.delete(sessionId);
      if (clientConns.size === 0) {
        clientConnections.delete(connection.clientId);
      }
    }

    // 接続から削除
    connections.delete(sessionId);

    console.log(
      `Connection ${sessionId} cleaned up successfully, remaining connections: ${connections.size}`,
    );
  } catch (error) {
    console.error(`Error cleaning up connection ${sessionId}:`, error);
    // エラーが発生してもマップから削除
    connections.delete(sessionId);
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
 * 非アクティブ接続の検出と削除
 */
export const detectInactiveConnections = (): void => {
  const now = Date.now();
  const inactiveConnections: string[] = [];

  for (const [sessionId, connection] of connections) {
    if (now - connection.lastActivity > CONNECTION_TIMEOUT) {
      inactiveConnections.push(sessionId);
    }
  }

  // 非同期でクリーンアップ（ブロッキングを避ける）
  for (const sessionId of inactiveConnections) {
    void cleanupConnection(sessionId);
  }

  if (inactiveConnections.length > 0) {
    console.log(
      `Cleaned up ${inactiveConnections.length} inactive connections`,
    );
  }
};

/**
 * 接続情報を登録
 */
export const registerConnection = (
  sessionId: string,
  connectionInfo: ConnectionInfo,
): void => {
  // 接続を登録
  connections.set(sessionId, connectionInfo);

  // クライアント接続数管理
  if (!clientConnections.has(connectionInfo.clientId)) {
    clientConnections.set(connectionInfo.clientId, new Set());
  }
  clientConnections.get(connectionInfo.clientId)!.add(sessionId);
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
 * SSE接続の確立
 */
export const establishConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // request header から apiKeyId を取得
  const apiKeyId = (req.query["api-key"] ?? req.headers["api-key"]) as
    | string
    | undefined;
  const clientId =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  console.log("apiKeyId", apiKeyId);
  console.log("clientId", clientId);

  if (!apiKeyId) {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    // Create a new SSE transport for the client
    const transport = new SSEServerTransportClass("/messages", res);
    const sessionId = transport.sessionId;
    const now = Date.now();

    // メッセージキューをプールから取得
    const messageQueue = messageQueuePool.acquire();

    const { server } = await getServer(apiKeyId);

    // 接続情報を作成
    const connectionInfo: ConnectionInfo = {
      transport,
      lastActivity: now,
      clientId,
      messageQueue,
      isProcessing: false,
      // 回復機能用フィールド
      connectionStartTime: now,
      lastHealthCheck: now,
      errorCount: 0,
      apiKeyId,
    };

    // 接続を登録
    registerConnection(sessionId, connectionInfo);

    // トランスポートが閉じられたときのクリーンアップ
    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      void cleanupConnection(sessionId);
    };

    // クライアント切断検出
    res.on("close", () => {
      console.log(`Client disconnected for session ${sessionId}`);
      void cleanupConnection(sessionId);
    });

    res.on("error", (error) => {
      console.error(`SSE connection error for session ${sessionId}:`, error);
      recordConnectionError(sessionId, error);
      void cleanupConnection(sessionId);
    });

    // 強化されたキープアライブとヘルスチェック
    const keepAliveInterval = setInterval(() => {
      const conn = connections.get(sessionId);
      if (!conn) {
        clearInterval(keepAliveInterval);
        return;
      }

      // 接続の健全性をチェック
      const healthState = checkConnectionHealth(sessionId);
      conn.lastHealthCheck = Date.now();

      try {
        // キープアライブメッセージの送信
        res.write(": keepalive\\n\\n");
        conn.lastActivity = Date.now();

        // 接続状態のログ出力（劣化状態の場合）
        if (healthState === ConnectionState.DEGRADED) {
          console.warn(`Connection ${sessionId} is in degraded state`);
        }
      } catch (error) {
        console.error(
          `Error sending keepalive for session ${sessionId}:`,
          error,
        );
        recordConnectionError(sessionId, error as Error);

        // 回復を試行
        void attemptConnectionRecovery(sessionId, async () => {
          // 新しい接続を試行する場合の処理
          // 現在の実装では単純にクリーンアップ
          return false;
        }).then((recovered) => {
          if (!recovered) {
            void cleanupConnection(sessionId);
          }
        });

        clearInterval(keepAliveInterval);
      }
    }, KEEPALIVE_INTERVAL);

    connectionInfo.keepAliveInterval = keepAliveInterval;

    await server.connect(transport);

    console.log(
      `Established SSE stream with session ID: ${sessionId}, total connections: ${connections.size}`,
    );
  } catch (error) {
    console.error("Error establishing SSE stream:", error);
    if (!res.headersSent) {
      res.status(500).send("Error establishing SSE stream");
    }
  }
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
