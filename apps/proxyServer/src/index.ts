import express from "express";
import { handleHealthCheck } from "./routes/health/index.js";
import { handleMCPRequest } from "./routes/mcp/index.js";
import { establishSSEConnection, handleSSEMessage } from "./utils/transport.js";
import { initializeApplication } from "./libs/startup.js";
import { startSessionCleanup } from "./utils/session.js";
import { logger } from "./libs/logger.js";
import { integratedAuthMiddleware } from "./middleware/integratedAuth.js";
import {
  loggingMiddleware,
  errorLoggingMiddleware,
} from "./middleware/logging.js";

/**
 * Express アプリケーションを設定
 */
const createApp = (): express.Application => {
  const app = express();

  // ミドルウェア設定
  app.use(express.json({ limit: "10mb" })); // JSONペイロードサイズ制限

  // ログミドルウェアを最初に適用
  app.use(loggingMiddleware());

  // CORS設定（必要に応じて）
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, mcp-session-id, api-key, x-api-key, x-client-id, Authorization",
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // ルート設定
  app.get("/", handleHealthCheck);
  app.get("/health", handleHealthCheck);

  // ここ以降のすべてのルートに統合認証ミドルウェアを適用
  app.use(integratedAuthMiddleware());

  // 新しいRESTfulエンドポイント（MCPサーバーID指定）
  app.post("/mcp/:userMcpServerInstanceId", handleMCPRequest);
  app.get("/mcp/:userMcpServerInstanceId", handleMCPRequest);
  app.delete("/mcp/:userMcpServerInstanceId", handleMCPRequest);

  // レガシーエンドポイント（後方互換性）
  app.post("/mcp", handleMCPRequest);
  app.get("/mcp", handleMCPRequest);
  app.delete("/mcp", handleMCPRequest);

  // 新しいRESTfulエンドポイント（SSE transport）
  app.get("/sse/:userMcpServerInstanceId", establishSSEConnection);
  app.post("/messages/:userMcpServerInstanceId", handleSSEMessage);

  // レガシーエンドポイント（後方互換性）
  app.get("/sse", establishSSEConnection);
  app.post("/messages", handleSSEMessage);

  // エラーハンドリングミドルウェアを最後に適用
  app.use(errorLoggingMiddleware());

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
