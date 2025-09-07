import { logger } from "../../libs/logger.js";
import type { ServerConfig } from "../../libs/types.js";
import {
  createConnection,
  markAsActive,
  markAsInactive,
  closeConnection,
  healthCheck,
} from "./connectionUtils.js";
import type {
  MCPConnection,
  MCPConnectionOptions,
  PoolConfig,
} from "./types.js";

// グローバル状態
const connectionPools = new Map<string, MCPConnection[]>();

// 接続プール設定（簡素化）
const CONFIG: PoolConfig = {
  maxConnectionsPerServer: 3, // MCPサーバーは軽量なため
  idleTimeout: 120000, // 2分
  cleanupInterval: 30000, // 30秒
};

let cleanupTimer: NodeJS.Timeout | undefined;

/**
 * プールキーを生成
 *
 * @param userServerConfigInstanceId - ユーザーサーバー設定インスタンスID
 * @param serverName - サーバー名
 * @returns プールキー
 */
const getPoolKey = (
  userServerConfigInstanceId: string,
  serverName: string,
): string => {
  return `${userServerConfigInstanceId}:${serverName}`;
};

/**
 * プールから利用可能な接続を取得
 *
 * @param poolKey - プールキー
 * @returns 利用可能な接続またはundefined
 */
const getAvailableConnection = (poolKey: string): MCPConnection | undefined => {
  const pool = connectionPools.get(poolKey) || [];
  return pool.find((conn) => !conn.isActive);
};

/**
 * 接続をプールから削除
 *
 * @param connection - 削除する接続
 */
const removeConnectionFromPool = (connection: MCPConnection): void => {
  const poolKey = getPoolKey(
    connection.userServerConfigInstanceId,
    connection.serverName,
  );
  const pool = connectionPools.get(poolKey);
  if (pool) {
    const index = pool.indexOf(connection);
    if (index > -1) {
      pool.splice(index, 1);
      if (pool.length === 0) {
        connectionPools.delete(poolKey);
      }
    }
  }
};

/**
 * アイドル接続をクリーンアップ
 */
const cleanupIdleConnections = async (): Promise<void> => {
  const now = Date.now();
  const connectionsToClose: MCPConnection[] = [];

  for (const pool of connectionPools.values()) {
    for (const connection of pool) {
      if (
        !connection.isActive &&
        now - connection.lastUsed > CONFIG.idleTimeout
      ) {
        connectionsToClose.push(connection);
      }
    }
  }

  if (connectionsToClose.length > 0) {
    logger.debug(`Cleaning up ${connectionsToClose.length} idle connections`);

    for (const connection of connectionsToClose) {
      try {
        await closeConnection(connection);
      } catch (error) {
        logger.warn("Failed to close idle connection", {
          serverName: connection.serverName,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        removeConnectionFromPool(connection);
      }
    }
  }
};

/**
 * クリーンアップタイマーを開始
 */
const startCleanupTimer = (): void => {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    cleanupIdleConnections().catch((error) => {
      logger.error("Error during idle connection cleanup", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, CONFIG.cleanupInterval);

  // Node.jsプロセスがクリーンアップタイマーで終了を妨げないように
  cleanupTimer.unref?.();
};

/**
 * 接続をプールから取得または新規作成
 *
 * @param userServerConfigInstanceId - ユーザーサーバー設定インスタンスID
 * @param serverName - サーバー名
 * @param serverConfig - サーバー設定
 * @returns MCP接続
 * @throws 最大接続数に達した場合または接続作成に失敗した場合
 */
export const getConnection = async (
  userServerConfigInstanceId: string,
  serverName: string,
  serverConfig: ServerConfig,
): Promise<MCPConnection> => {
  const poolKey = getPoolKey(userServerConfigInstanceId, serverName);

  // クリーンアップタイマーを開始（初回のみ）
  startCleanupTimer();

  // プールから利用可能な接続を探す
  const availableConnection = getAvailableConnection(poolKey);
  if (availableConnection) {
    // ヘルスチェックを実行
    if (await healthCheck(availableConnection)) {
      markAsActive(availableConnection);
      logger.debug("Reused existing connection from pool", { serverName });
      return availableConnection;
    } else {
      // 不健全な接続は削除
      await closeConnection(availableConnection);
      removeConnectionFromPool(availableConnection);
    }
  }

  // プール内の接続数をチェック
  const pool = connectionPools.get(poolKey) || [];
  if (pool.length >= CONFIG.maxConnectionsPerServer) {
    throw new Error(
      `Maximum connections (${CONFIG.maxConnectionsPerServer}) reached for server: ${serverName}`,
    );
  }

  // 新しい接続を作成
  const options: MCPConnectionOptions = {
    userServerConfigInstanceId,
    serverName,
    serverConfig,
  };

  const newConnection = await createConnection(serverConfig, options);
  markAsActive(newConnection);

  // プールに追加
  const currentPool = connectionPools.get(poolKey) || [];
  currentPool.push(newConnection);
  connectionPools.set(poolKey, currentPool);

  logger.debug("Created new MCP connection", { serverName });
  return newConnection;
};

/**
 * 接続をプールに返却
 *
 * @param connection - 返却する接続
 */
export const releaseConnection = async (
  connection: MCPConnection,
): Promise<void> => {
  markAsInactive(connection);
  logger.debug("Released connection to pool", {
    serverName: connection.serverName,
  });
};

/**
 * 全接続プールをクリーンアップ
 */
export const cleanup = async (): Promise<void> => {
  // クリーンアップタイマーを停止
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = undefined;
  }

  // 全ての接続を閉じる
  const allConnections: MCPConnection[] = [];
  for (const pool of connectionPools.values()) {
    allConnections.push(...pool);
  }

  await Promise.allSettled(
    allConnections.map((connection) => closeConnection(connection)),
  );

  // プールをクリア
  connectionPools.clear();
  logger.debug("Cleaned up all connection pools");
};
