import express from "express";
import { handleHealthCheck } from "./routes/health/index.js";
import { handleMCPRequest } from "./routes/mcp/index.js";
import { handleSSEConnection, handleSSEMessages } from "./routes/sse/index.js";
import { initializeApplication } from "./lifecycle/startup.js";
import { startSessionCleanup } from "./utils/session.js";
import { logger } from "./libs/logger.js";

/**
 * Express アプリケーションを設定
 */
const createApp = (): express.Application => {
  const app = express();

  // ミドルウェア設定
  app.use(express.json({ limit: "10mb" })); // JSONペイロードサイズ制限

  // CORS設定（必要に応じて）
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, mcp-session-id, api-key, x-client-id",
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // ルート設定
  app.get("/", handleHealthCheck);

  // 統合MCPエンドポイント（Streamable HTTP transport）
  app.post("/mcp", handleMCPRequest);
  app.get("/mcp", handleMCPRequest);
  app.delete("/mcp", handleMCPRequest);

  // SSE transport エンドポイント（後方互換性）
  app.get("/sse", handleSSEConnection);
  app.post("/messages", handleSSEMessages);

  return app;
};

/**
 * サーバーを起動
 */
const startServer = (): void => {
  // アプリケーション初期化
  initializeApplication();

  // セッションクリーンアップを開始
  startSessionCleanup();
  logger.info("Session cleanup started");

  // Express アプリケーション作成
  const app = createApp();

  // サーバー起動
  const PORT = 8080;
  app.listen(PORT, () => {
    logger.info(
      "MCP Proxy Server supports both Streamable HTTP and SSE transports",
    );
    logger.info(`> Listening on port ${PORT}`);
    logger.info(`> streamableHttpEndpoint: http://localhost:${PORT}/mcp`);
    logger.info(`> sseEndpoint: http://localhost:${PORT}/sse`);
  });
};

// サーバー起動
startServer();
