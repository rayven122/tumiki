/**
 * SSE接続プール管理クラス
 */
export class SSEConnectionPool {
  private activeConnections = 0;
  private totalConnections = 0;

  addConnection(): void {
    this.activeConnections++;
    this.totalConnections++;
  }

  removeConnection(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
  }

  getPoolStats() {
    return {
      activeConnections: this.activeConnections,
      totalConnections: this.totalConnections,
    };
  }

  destroy(): void {
    this.activeConnections = 0;
    this.totalConnections = 0;
  }
}

// シングルトンインスタンス
let sseConnectionPool: SSEConnectionPool | null = null;

/**
 * SSE接続プールのシングルトンインスタンスを取得
 */
export const getSSEConnectionPool = (): SSEConnectionPool => {
  if (!sseConnectionPool) {
    sseConnectionPool = new SSEConnectionPool();
  }
  return sseConnectionPool;
};

// プロセス終了時のクリーンアップ
process.on("SIGTERM", () => {
  try {
    const pool = getSSEConnectionPool();
    if (pool) {
      pool.destroy();
    }
  } catch (error) {
    console.error("Error destroying SSE pool:", error);
  }
});

// メモリリーク防止のためのプロセスイベント監視
process.on("warning", (warning) => {
  if (warning.name === "MaxListenersExceededWarning") {
    console.warn(
      "[Process Warning] MaxListenersExceededWarning:",
      warning.message,
    );
  } else {
    console.warn("[Process Warning]", warning);
  }
});

// 定期的なメモリ使用量ログ
setInterval(
  () => {
    const usage = process.memoryUsage();
    const stats = {
      rss: Math.round(usage.rss / 1024 / 1024) + "MB",
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + "MB",
      external: Math.round(usage.external / 1024 / 1024) + "MB",
    };

    // メモリ使用量が高い場合のみログ出力
    if (usage.heapUsed > 100 * 1024 * 1024) {
      // 100MB超過時
      console.log("[Memory Usage]", stats);
    }
  },
  5 * 60 * 1000,
); // 5分ごと
