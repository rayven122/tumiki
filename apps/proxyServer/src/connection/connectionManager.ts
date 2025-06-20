import type { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { messageQueuePool } from "../utils/objectPool.js";

// SSE接続管理の設定
/** SSE接続のタイムアウト設定（ミリ秒）　60秒 */
export const CONNECTION_TIMEOUT = 60 * 1000;
/** キープアライブの間隔（ミリ秒）　30秒 */
export const KEEPALIVE_INTERVAL = 30 * 1000;

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

// 効率的な接続プール管理
export const connections = new Map<string, ConnectionInfo>();
// クライアントごとの接続数管理
export const clientConnections = new Map<string, Set<string>>();

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
    console.error(
      `Connection error for ${sessionId} (total: ${connection.errorCount}):`,
      error.message,
    );
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

  return timeSinceActivity <= CONNECTION_TIMEOUT && connection.errorCount < 5;
};

/**
 * 接続のクリーンアップ処理
 */
export const cleanupConnection = async (sessionId: string): Promise<void> => {
  try {
    const connection = connections.get(sessionId);
    if (!connection) {
      console.warn(`Connection ${sessionId} not found for cleanup`);
      return;
    }

    const connectionDuration = Date.now() - connection.connectionStartTime;
    console.log(
      `Cleaning up connection ${sessionId} (duration: ${Math.round(connectionDuration / 1000)}s, errors: ${connection.errorCount})`,
    );

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
