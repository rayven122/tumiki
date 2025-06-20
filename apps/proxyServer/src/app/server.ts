import express from "express";
import { handleHealthCheck } from "./routes/health.js";
import { handleSSEConnection } from "./routes/sse.js";
import { handleMessage } from "./routes/messages.js";
import { initializeApplication } from "../infrastructure/lifecycle/startup.js";
import { logger } from "../infrastructure/utils/logger.js";

/**
 * Express アプリケーションを設定
 */
const createApp = (): express.Application => {
  const app = express();

  // ミドルウェア設定
  app.use(express.json({ limit: "10mb" })); // JSONペイロードサイズ制限

  // ルート設定
  app.get("/", handleHealthCheck);
  app.get("/mcp", handleSSEConnection);
  app.post("/messages", handleMessage);

  return app;
};

/**
 * サーバーを起動
 */
const startServer = (): void => {
  // アプリケーション初期化
  initializeApplication();

  // Express アプリケーション作成
  const app = createApp();

  // サーバー起動
  const PORT = 8080;
  app.listen(PORT, () => {
    logger.info("MCP Proxy Server started", {
      port: PORT,
      sseEndpoint: `http://localhost:${PORT}/mcp`,
    });
  });
};

// サーバー起動
startServer();
