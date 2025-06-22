import express from "express";
import { cookieJWTAuthMiddleware } from "./middleware/auth.js";
import { handleHealthCheck } from "./routes/health.js";
import { handleMCPRequest } from "./routes/mcp.js";
import { handleSSEConnection, handleSSEMessages } from "./routes/sse.js";
import { handleAuthMetadata } from "./routes/oauth.js";
import { initializeApplication } from "./lifecycle/startup.js";
import { startSessionCleanup } from "./services/session.js";
import { logger } from "./lib/logger.js";
import type { AuthenticatedRequest } from "./middleware/auth.js";

/**
 * Express アプリケーションを設定
 */
const createApp = (): express.Application => {
  const app = express();

  // プロキシ信頼設定（認証に必要）
  app.set("trust proxy", true);

  // ミドルウェア設定
  app.use(express.json({ limit: "10mb" })); // JSONペイロードサイズ制限

  // CORS設定（クロスドメイン認証対応）
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "http://localhost:3000", // 開発環境
      "https://tumiki.cloud", // 本番環境
      "https://app.tumiki.cloud", // 本番環境アプリサブドメイン
    ];

    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, mcp-session-id, api-key, x-client-id, authorization, cookie",
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // MCPプロトコル準拠の認証メタデータエンドポイント
  app.get("/.well-known/oauth-authorization-server", handleAuthMetadata);

  // Alternative path for testing
  app.get("/well-known/oauth-authorization-server", handleAuthMetadata);

  // ルート設定
  app.get("/", handleHealthCheck);

  // 全てのルートでCookieベースのJWT認証を適用
  console.log("Registering cookieJWTAuthMiddleware");
  app.use(cookieJWTAuthMiddleware);

  // 統合MCPエンドポイント（Streamable HTTP transport）
  // Cookie-based JWT認証を適用（ハンドラー内でAPI key + セッション両方チェック）
  app.post("/mcp", (req, res, next) => {
    handleMCPRequest(req as AuthenticatedRequest, res).catch(next);
  });
  app.get("/mcp", (req, res, next) => {
    handleMCPRequest(req as AuthenticatedRequest, res).catch(next);
  });
  app.delete("/mcp", (req, res, next) => {
    handleMCPRequest(req as AuthenticatedRequest, res).catch(next);
  });

  // SSE transport エンドポイント（後方互換性）
  app.get("/sse", (req, res, next) => {
    handleSSEConnection(req as AuthenticatedRequest, res).catch(next);
  });
  app.post("/messages", (req, res, next) => {
    handleSSEMessages(req as AuthenticatedRequest, res).catch(next);
  });

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
