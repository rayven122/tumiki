import { getSSEConnectionPool } from "../../core/proxy/reconnectingSSEClient.js";

/**
 * SSE接続プールの統計を取得する関数
 */
export const getPoolInfo = (): string => {
  try {
    const pool = getSSEConnectionPool();
    const poolStats = pool.getPoolStats();
    return `Pool: ${poolStats.activeConnections}/${poolStats.totalConnections}`;
  } catch {
    return "Pool: N/A";
  }
};
