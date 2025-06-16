export default {
  apps: [
    {
      name: "tumiki-proxy-server",
      script: "node",
      args: "build/sse.js",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 8080,
      },
      // 以下の設定により安定性を向上
      min_uptime: "10s", // 最小稼働時間
      max_restarts: 10, // 最大リスタート回数
      restart_delay: 4000, // リスタート間隔
      exp_backoff_restart_delay: 100, // 指数バックオフ
    },
  ],
};