#!/usr/bin/env node
import { db } from "@tumiki/db/server";

import app from "./app.js";
import {
  initializeScheduler,
  shutdownScheduler,
} from "./features/scheduler/index.js";
import { cleanupStaleExecutions } from "./features/agentExecutor/route.js";
import { DEFAULT_PORT } from "./shared/constants/server.js";
import {
  TIMEOUT_CONFIG,
  AGENT_EXECUTION_CONFIG,
} from "./shared/constants/config.js";
import { logInfo, logError } from "./shared/logger/index.js";

// サーバー起動
const port = Number(process.env.PORT) || DEFAULT_PORT;

const devMode = process.env.DEV_MODE === "true";

logInfo(`Starting Tumiki MCP Proxy on port ${port}`, {
  nodeEnv: process.env.NODE_ENV,
  mode: "stateless (Hono + MCP SDK)",
  devMode: devMode ? "enabled (auth bypass, fixed Context7 MCP)" : "disabled",
});

// 定期クリーンアップ用のインターバルID（グレースフルシャットダウンでクリア）
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

// Node.js環境用のHTTPサーバー起動
/* v8 ignore start */
if (process.env.NODE_ENV !== "test") {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port }, (info) => {
    logInfo(`Server is running on http://localhost:${info.port}`);
    // 古い稼働中エージェント実行をクリーンアップ（起動時）
    void cleanupStaleExecutions();
    // 定期的なクリーンアップを開始（本番環境でのネットワークエラー対応）
    cleanupIntervalId = setInterval(() => {
      void cleanupStaleExecutions();
    }, AGENT_EXECUTION_CONFIG.CLEANUP_INTERVAL_MS);
    logInfo("Agent execution cleanup scheduler started", {
      intervalMs: AGENT_EXECUTION_CONFIG.CLEANUP_INTERVAL_MS,
    });
    // スケジューラを初期化（非同期）
    void initializeScheduler();
  });
}
/* v8 ignore stop */

// Graceful shutdown handlers
const gracefulShutdown = async (): Promise<void> => {
  logInfo("Starting graceful shutdown");

  const shutdownTimeout = TIMEOUT_CONFIG.GRACEFUL_SHUTDOWN_MS; // Cloud Runの猶予期間内

  const shutdownPromise = (async () => {
    try {
      // 定期クリーンアップを停止
      if (cleanupIntervalId) {
        logInfo("Stopping agent execution cleanup scheduler");
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
      }

      // スケジューラを停止
      logInfo("Stopping scheduler");
      shutdownScheduler();

      // Prisma DB接続をクローズ
      logInfo("Closing database connection");
      await db.$disconnect();

      logInfo("Graceful shutdown completed successfully");
    } catch (error) {
      logError("Error during graceful shutdown", error as Error);
    }
  })();

  // タイムアウト監視用Promise
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      logInfo(
        `Shutdown timeout reached (${shutdownTimeout}ms), but waiting for cleanup to complete`,
      );
      resolve();
    }, shutdownTimeout);
  });

  // タイムアウトをログに記録しつつ、実際のクリーンアップ完了を待つ
  await Promise.all([timeoutPromise, shutdownPromise]);
};

// SIGTERMハンドラー（Cloud Run終了時）
process.on("SIGTERM", () => {
  logInfo("SIGTERM received");
  void gracefulShutdown().then(() => {
    process.exit(0);
  });
});

// SIGINTハンドラー（ローカル開発用、Ctrl+C）
process.on("SIGINT", () => {
  logInfo("SIGINT received");
  void gracefulShutdown().then(() => {
    process.exit(0);
  });
});

export default {
  port,
  fetch: app.fetch,
};
