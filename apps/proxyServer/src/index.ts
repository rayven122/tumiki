import express from "express";
import { handleHealthCheck } from "./routes/health.js";
import { handleMCPRequest } from "./routes/mcp.js";
import { handleSSEConnection, handleSSEMessages } from "./routes/sse.js";
import {
  handleOAuthAuthorize,
  handleOAuthCallback,
  handleOAuthToken,
  handleOAuthUserInfo,
} from "./routes/oauth.js";
import { handleOAuthMetadata } from "./routes/oauthMetadata.js";
import { auth0JwtMiddleware, initializeAuth0Jwt } from "./middleware/auth0Jwt.js";
import { apiKeyAuth } from "./middleware/apiKeyAuth.js";
import { combinedAuthMiddleware } from "./middleware/combinedAuth.js";
import { initializeApplication } from "./lifecycle/startup.js";
import { startSessionCleanup } from "./services/session.js";
import { logger } from "./lib/logger.js";

/**
 * Express アプリケーションを設定
 */
const createApp = (): express.Application => {
  const app = express();

  // ミドルウェア設定
  app.use(express.json({ limit: "10mb" })); // JSONペイロードサイズ制限
  app.use(express.urlencoded({ extended: true }));

  // CORS設定（必要に応じて）
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, mcp-session-id, api-key, x-api-key, x-client-id",
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });


  // Authentication middlewares
  // API Key authentication (for legacy support)
  app.use(apiKeyAuth());
  
  // Auth0 JWT authentication middleware (for M2M tokens)
  app.use(auth0JwtMiddleware());

  // Combined authentication middleware
  app.use(combinedAuthMiddleware());

  // ルート設定
  app.get("/", handleHealthCheck);

  // OAuth 2.0 Authorization Server Metadata (RFC 8414)
  app.get("/.well-known/oauth-authorization-server", handleOAuthMetadata);

  // OAuth 2.1 endpoints
  app.get("/oauth/authorize", handleOAuthAuthorize);
  app.get("/oauth/callback", handleOAuthCallback);
  app.post("/oauth/token", handleOAuthToken);
  app.get("/oauth/userinfo", handleOAuthUserInfo);


  // 統合MCPエンドポイント（Streamable HTTP transport）
  // 認証を必須に（統合認証が内部で処理）
  app.post("/mcp", handleMCPRequest);
  app.get("/mcp", handleMCPRequest);
  app.delete("/mcp", handleMCPRequest);
  
  // SSE transport エンドポイント（後方互換性）
  // SSEはAPIキー認証を内部で処理するため、ミドルウェアは不要
  app.get("/sse", handleSSEConnection);
  app.post("/messages", handleSSEMessages);

  return app;
};

/**
 * サーバーを起動
 */
const startServer = async (): Promise<void> => {
  // アプリケーション初期化
  initializeApplication();

  // Auth0 JWT 認証サービス初期化
  const jwtInitialized = initializeAuth0Jwt();
  if (jwtInitialized) {
    logger.info("Auth0 JWT authentication initialized successfully");
  } else {
    logger.warn("Auth0 JWT authentication not initialized - M2M authentication will be disabled");
  }

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
void startServer();
