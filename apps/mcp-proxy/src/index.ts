#!/usr/bin/env node
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logInfo, logError } from "./libs/logger/index.js";
import { closeRedisClient } from "./libs/cache/redis.js";
import { db } from "@tumiki/db/server";
import type { HonoEnv } from "./types/index.js";
import { DEFAULT_PORT } from "./constants/server.js";
import { TIMEOUT_CONFIG } from "./constants/config.js";
import { healthRoute } from "./routes/health.js";
import { mcpRoute } from "./routes/mcp.js";
import { unifiedCrudRoute } from "./routes/unifiedCrud.js";
import { wellKnownRoute } from "./routes/wellKnown.js";
import { oauthRoute } from "./routes/oauthRoute.js";

// Hono アプリケーションの作成
const app = new Hono<HonoEnv>();

// CORS設定
app.use("/*", cors());

// ルートをマウント
app.route("/", healthRoute);
app.route("/", mcpRoute); // /mcp/:serverId（通常MCPサーバーと統合MCPサーバーの両方に対応）
app.route("/unified", unifiedCrudRoute); // 統合MCPサーバーCRUD API
app.route("/.well-known", wellKnownRoute);
app.route("/oauth", oauthRoute);

// サーバー起動
const port = Number(process.env.PORT) || DEFAULT_PORT;

const devMode = process.env.DEV_MODE === "true";

logInfo(`Starting Tumiki MCP Proxy on port ${port}`, {
  nodeEnv: process.env.NODE_ENV,
  mode: "stateless (Hono + MCP SDK)",
  devMode: devMode ? "enabled (auth bypass, fixed Context7 MCP)" : "disabled",
});

// Node.js環境用のHTTPサーバー起動
if (process.env.NODE_ENV !== "test") {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port }, (info) => {
    logInfo(`Server is running on http://localhost:${info.port}`);
  });
}

// Graceful shutdown handlers
const gracefulShutdown = async (): Promise<void> => {
  logInfo("Starting graceful shutdown");

  const shutdownTimeout = TIMEOUT_CONFIG.GRACEFUL_SHUTDOWN_MS; // Cloud Runの猶予期間内

  const shutdownPromise = (async () => {
    try {
      // Redis接続をクローズ
      logInfo("Closing Redis connection");
      await closeRedisClient();

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
