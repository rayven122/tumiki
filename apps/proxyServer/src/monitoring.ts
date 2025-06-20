import { getSSEConnectionPool } from "./proxy/reconnectingSSEClient.js";

/**
 * SSE接続プールの統計を取得する簡易関数
 */
export function getPoolInfo(): string {
  try {
    const pool = getSSEConnectionPool();
    const poolStats = pool.getPoolStats();
    return `Pool: ${poolStats.activeConnections}/${poolStats.totalConnections}`;
  } catch {
    return "Pool: N/A";
  }
}
