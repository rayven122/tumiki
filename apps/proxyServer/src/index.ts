import express from "express";
import { handleHealthCheck } from "./routes/health/index.js";
import { handleMCPRequest } from "./routes/mcp/index.js";
import {
  handleOAuthDiscovery,
  handleOpenIDConfiguration,
} from "./routes/oauth/index.js";
import { establishSSEConnection, handleSSEMessage } from "./utils/transport.js";
import { initializeApplication } from "./libs/startup.js";
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

  // CORS設定
  app.use((req, res, next) => {
    // 許可するオリジンのリスト
    const allowedOrigins = [
      "http://localhost:8080",
      "http://local-server.tumiki.cloud:8080",
      "https://server.tumiki.cloud",
    ];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }

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

  // OAuthディスカバリーエンドポイント（認証不要）
  app.get("/.well-known/oauth-authorization-server", handleOAuthDiscovery);
  app.get("/.well-known/openid-configuration", handleOpenIDConfiguration);

  // ここ以降のすべてのルートに統合認証ミドルウェアを適用
  app.use(integratedAuthMiddleware());

  // 新しいRESTfulエンドポイント（MCPサーバーID指定）
  app.all("/mcp/:userMcpServerInstanceId", handleMCPRequest);

  // レガシーエンドポイント（後方互換性）
  app.all("/mcp", handleMCPRequest);

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
