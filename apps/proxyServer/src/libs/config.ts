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
} as const;
