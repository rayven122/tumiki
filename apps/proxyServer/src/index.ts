import express from "express";
import { handleHealthCheck } from "./routes/health/index.js";
import { handleMCPRequest } from "./routes/mcp/index.js";
import {
  handleOAuthDiscovery,
  handleOpenIDConfiguration,
} from "./routes/oauth/index.js";
import { handleOAuthRegister } from "./routes/oauth/register.js";
import { handleOAuthToken } from "./routes/oauth/token.js";
import { handleOAuthProtectedResource } from "./routes/oauth/resource.js";
import { handleOAuthAuthorize } from "./routes/oauth/authorize.js";
import { handleOAuthCallback } from "./routes/oauth/callback.js";
import { establishSSEConnection, handleSSEMessage } from "./utils/transport.js";
import { initializeApplication } from "./libs/startup.js";
import { logger } from "./libs/logger.js";
import { integratedAuthMiddleware } from "./middleware/integratedAuth.js";
import {
  loggingMiddleware,
  errorLoggingMiddleware,
} from "./middleware/logging.js";
import { corsMiddleware } from "./libs/corsConfig.js";

/**
 * Express アプリケーションを設定
 */
const createApp = (): express.Application => {
  const app = express();

  // ミドルウェア設定
  app.use(express.json({ limit: "10mb" })); // JSONペイロードサイズ制限
  app.use(express.urlencoded({ extended: true, limit: "10mb" })); // URLエンコードされたボディのパース

  // ログミドルウェアを最初に適用
  app.use(loggingMiddleware());

  // CORS設定
  app.use(corsMiddleware());

  // ルート設定
  app.get("/", handleHealthCheck);
  app.get("/health", handleHealthCheck);

  // OAuthディスカバリーエンドポイント（認証不要）
  app.get("/.well-known/oauth-authorization-server", handleOAuthDiscovery);
  app.get("/.well-known/openid-configuration", handleOpenIDConfiguration);
  app.get(
    "/.well-known/oauth-protected-resource",
    handleOAuthProtectedResource,
  );
  app.use(
    "/.well-known/oauth-protected-resource",
    handleOAuthProtectedResource,
  );

  // OAuth Dynamic Client Registration エンドポイント（認証不要）
  app.post("/oauth/register", handleOAuthRegister);
  app.post("/oauth/token", handleOAuthToken);
  app.all("/oauth/authorize", handleOAuthAuthorize);
  app.get("/oauth/callback", handleOAuthCallback);

  // MCP仕様のフォールバックパス（認証不要）
  app.post("/register", handleOAuthRegister);
  app.post("/token", handleOAuthToken);

  // MCPエンドポイントに個別に統合認証ミドルウェアを適用
  // 新しいRESTfulエンドポイント（MCPサーバーID指定）
  app.all(
    "/mcp/:userMcpServerInstanceId",
    integratedAuthMiddleware(),
    handleMCPRequest,
  );

  // レガシーエンドポイント（後方互換性）
  app.all("/mcp", integratedAuthMiddleware(), handleMCPRequest);

  // 新しいRESTfulエンドポイント（SSE transport）
  app.get(
    "/sse/:userMcpServerInstanceId",
    integratedAuthMiddleware(),
    establishSSEConnection,
  );
  app.post(
    "/messages/:userMcpServerInstanceId",
    integratedAuthMiddleware(),
    handleSSEMessage,
  );

  // レガシーエンドポイント（後方互換性）
  app.get("/sse", integratedAuthMiddleware(), establishSSEConnection);
  app.post("/messages", integratedAuthMiddleware(), handleSSEMessage);

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
