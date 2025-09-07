import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { logger } from "../../libs/logger.js";
import type { ServerConfig } from "../../libs/types.js";
import { getConnection, releaseConnection } from "./poolManager.js";

// 型定義の再エクスポート
export type {
  MCPConnection,
  MCPConnectionOptions,
  PoolConfig,
} from "./types.js";

// ユーティリティ関数の再エクスポート（テスト用）
export {
  createMCPConnection,
  healthCheck,
  markAsActive,
  markAsInactive,
  closeConnection,
  createConnection,
} from "./connectionUtils.js";

// プール管理関数の再エクスポート
export { getConnection, releaseConnection } from "./poolManager.js";

/**
 * MCPクライアントを使用した処理を自動的にリソース管理で実行
 *
 * @param userServerConfigInstanceId - ユーザーサーバー設定インスタンスID
 * @param serverName - サーバー名
 * @param serverConfig - サーバー設定
 * @param operation - MCPクライアントを使用する処理
 * @returns 処理の結果
 * @throws 接続作成に失敗した場合
 */
export const withConnection = async <T>(
  userServerConfigInstanceId: string,
  serverName: string,
  serverConfig: ServerConfig,
  operation: (client: Client) => Promise<T>,
): Promise<T> => {
  const connection = await getConnection(
    userServerConfigInstanceId,
    serverName,
    serverConfig,
  );

  try {
    const result = await operation(connection.client);
    return result;
  } catch (error) {
    logger.error("Operation failed with MCP connection", {
      serverName: connection.serverName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await releaseConnection(connection);
  }
};

/**
 * 複数のMCP操作を同一の接続で並列実行（簡素化版）
 *
 * @param userServerConfigInstanceId - ユーザーサーバー設定インスタンスID
 * @param serverName - サーバー名
 * @param serverConfig - サーバー設定
 * @param operations - MCPクライアントを使用する処理の配列
 * @returns 全処理の結果の配列
 * @throws 接続作成に失敗した場合
 */
export const withConnectionBatch = async <T>(
  userServerConfigInstanceId: string,
  serverName: string,
  serverConfig: ServerConfig,
  operations: Array<(client: Client) => Promise<T>>,
): Promise<T[]> => {
  if (operations.length === 0) {
    return [];
  }

  const connection = await getConnection(
    userServerConfigInstanceId,
    serverName,
    serverConfig,
  );

  try {
    const results = await Promise.all(
      operations.map((operation) => operation(connection.client)),
    );
    return results;
  } catch (error) {
    logger.error("Batch operations failed with MCP connection", {
      serverName: connection.serverName,
      operationCount: operations.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await releaseConnection(connection);
  }
};
