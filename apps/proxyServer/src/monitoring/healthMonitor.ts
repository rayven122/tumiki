import { getPoolInfo } from "../monitoring.js";
import { connections } from "../connection/connectionManager.js";

/**
 * システムヘルスチェック
 */
export const logSystemHealth = (): void => {
  const sessionCount = connections.size;
  const poolInfo = getPoolInfo();

  // メモリ使用量の監視
  const memUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heap: Math.round(memUsage.heapUsed / 1024 / 1024),
  };

  console.log(
    `[HEALTH] System: Connections=${sessionCount}, ${poolInfo}, Memory: RSS=${memoryMB.rss}MB, Heap=${memoryMB.heap}MB`,
  );
};
