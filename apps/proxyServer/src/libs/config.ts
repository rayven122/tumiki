export const config = {
  // タイムアウト設定
  timeouts: {
    request: parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10), // 30秒
    connection: parseInt(process.env.CONNECTION_TIMEOUT_MS || "60000", 10), // 60秒
    keepalive: parseInt(process.env.KEEPALIVE_INTERVAL_MS || "30000", 10), // 30秒
  },

  // リトライ設定
  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || "3", 10),
    delayMs: parseInt(process.env.RETRY_DELAY_MS || "2500", 10),
  },

  // 接続設定
  connection: {
    maxErrorCount: parseInt(process.env.MAX_ERROR_COUNT || "5", 10),
  },

  // メトリクス設定
  metrics: {
    enabled: process.env.METRICS_ENABLED === "true",
    interval: parseInt(process.env.METRICS_INTERVAL_MS || "60000", 10), // 1分
  },

  // メンテナンスモード設定
  maintenance: {
    enabled: process.env.MAINTENANCE_MODE === "true",
    message: "システムメンテナンス中です。しばらくお待ちください。",
    endTime: process.env.MAINTENANCE_END_TIME,
    allowedIPs:
      process.env.MAINTENANCE_ALLOWED_IPS?.split(",").map((ip) => ip.trim()) ||
      [],
  },

  // 接続プール設定（4GB最適化）
  connectionPool: {
    maxTotalConnections: parseInt(process.env.MCP_POOL_MAX_TOTAL || "60", 10), // 全体で最大60接続
    maxConnectionsPerServer: parseInt(
      process.env.MCP_POOL_MAX_PER_SERVER || "5",
      10,
    ), // サーバーあたり最大5接続
    maxConnectionsPerSession: parseInt(
      process.env.MAX_CONNECTIONS_PER_SESSION || "3",
      10,
    ), // セッションあたり最大3接続
    idleTimeout: parseInt(
      process.env.MCP_CONNECTION_TIMEOUT_MS ||
        process.env.MCP_POOL_IDLE_TIMEOUT_MS ||
        "60000",
      10,
    ), // MCPプールタイムアウト（セッションと同期）
    healthCheckInterval: parseInt(
      process.env.MCP_POOL_HEALTH_CHECK_MS || "60000",
      10,
    ), // 1分ごとのヘルスチェック
    maxRetries: parseInt(process.env.MCP_POOL_MAX_RETRIES || "3", 10), // 接続失敗時のリトライ数
    cleanupInterval: parseInt(
      process.env.MCP_POOL_CLEANUP_INTERVAL_MS || "30000",
      10,
    ), // 30秒ごとのクリーンアップ（セッションクリーンアップと同期）
    sessionPoolSync: process.env.SESSION_POOL_SYNC === "true", // セッション独立プール有効化
  },

  // キャッシュ設定（4GB最適化）
  cache: {
    maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || "100", 10), // 最大100エントリ
    ttl: parseInt(process.env.CACHE_TTL_MS || "600000", 10), // 10分TTL
    maxMemoryMB: parseInt(process.env.CACHE_MAX_MEMORY_MB || "150", 10), // 最大150MBメモリ使用
    cleanupInterval: parseInt(
      process.env.CACHE_CLEANUP_INTERVAL_MS || "60000",
      10,
    ), // 1分ごとのクリーンアップ
  },
} as const;

/**
 * 設定値の妥当性を検証
 */
const validateConfig = () => {
  const errors: string[] = [];

  // 接続プール設定の検証
  const pool = config.connectionPool;

  if (pool.maxTotalConnections <= 0 || pool.maxTotalConnections > 1000) {
    errors.push(
      `maxTotalConnections must be between 1-1000, got: ${pool.maxTotalConnections}`,
    );
  }

  if (pool.maxConnectionsPerServer <= 0 || pool.maxConnectionsPerServer > 100) {
    errors.push(
      `maxConnectionsPerServer must be between 1-100, got: ${pool.maxConnectionsPerServer}`,
    );
  }

  if (
    pool.maxConnectionsPerSession <= 0 ||
    pool.maxConnectionsPerSession > 50
  ) {
    errors.push(
      `maxConnectionsPerSession must be between 1-50, got: ${pool.maxConnectionsPerSession}`,
    );
  }

  if (pool.maxConnectionsPerServer > pool.maxTotalConnections) {
    errors.push(
      `maxConnectionsPerServer (${pool.maxConnectionsPerServer}) cannot exceed maxTotalConnections (${pool.maxTotalConnections})`,
    );
  }

  if (pool.idleTimeout < 1000 || pool.idleTimeout > 3600000) {
    errors.push(
      `idleTimeout must be between 1s-1h (1000-3600000ms), got: ${pool.idleTimeout}`,
    );
  }

  if (pool.cleanupInterval < 1000 || pool.cleanupInterval > 300000) {
    errors.push(
      `cleanupInterval must be between 1s-5min (1000-300000ms), got: ${pool.cleanupInterval}`,
    );
  }

  if (pool.healthCheckInterval < 5000 || pool.healthCheckInterval > 600000) {
    errors.push(
      `healthCheckInterval must be between 5s-10min (5000-600000ms), got: ${pool.healthCheckInterval}`,
    );
  }

  if (pool.maxRetries < 0 || pool.maxRetries > 10) {
    errors.push(`maxRetries must be between 0-10, got: ${pool.maxRetries}`);
  }

  // キャッシュ設定の検証
  const cache = config.cache;

  if (cache.maxEntries <= 0 || cache.maxEntries > 10000) {
    errors.push(
      `cache.maxEntries must be between 1-10000, got: ${cache.maxEntries}`,
    );
  }

  if (cache.ttl < 1000 || cache.ttl > 86400000) {
    errors.push(
      `cache.ttl must be between 1s-24h (1000-86400000ms), got: ${cache.ttl}`,
    );
  }

  if (cache.maxMemoryMB <= 0 || cache.maxMemoryMB > 2048) {
    errors.push(
      `cache.maxMemoryMB must be between 1-2048MB, got: ${cache.maxMemoryMB}`,
    );
  }

  if (cache.cleanupInterval < 1000 || cache.cleanupInterval > 600000) {
    errors.push(
      `cache.cleanupInterval must be between 1s-10min (1000-600000ms), got: ${cache.cleanupInterval}`,
    );
  }

  // リトライ設定の検証
  if (config.retry.maxAttempts < 0 || config.retry.maxAttempts > 10) {
    errors.push(`retry.maxAttempts must be between 0-10, got: ${config.retry.maxAttempts}`);
  }

  if (config.retry.delayMs < 100 || config.retry.delayMs > 60000) {
    errors.push(`retry.delayMs must be between 100ms-60s (100-60000ms), got: ${config.retry.delayMs}`);
  }

  // タイムアウト設定の検証
  if (config.timeouts.request < 1000 || config.timeouts.request > 300000) {
    errors.push(`timeouts.request must be between 1s-5min (1000-300000ms), got: ${config.timeouts.request}`);
  }

  if (config.timeouts.connection < 1000 || config.timeouts.connection > 300000) {
    errors.push(`timeouts.connection must be between 1s-5min (1000-300000ms), got: ${config.timeouts.connection}`);
  }

  if (errors.length > 0) {
    const errorMessage = `Configuration validation failed:\n${errors.join("\n")}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// 設定を検証して警告を出力
try {
  validateConfig();
  console.log("✅ Configuration validation passed");
} catch (error) {
  console.error(
    "❌ Configuration validation failed:",
    error instanceof Error ? error.message : String(error),
  );
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}
