import express, { type Request, type Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { getServer } from "./proxy/getServer.js";
import { logSystemHealth } from "./monitoring.js";
import { requireAuthWithRedirect } from "./middleware/auth-redirect.js";
import authRoutes from "./routes/auth.js";
import callbackRoutes from "./routes/callback.js";
import type { AuthenticatedRequest } from "./types/auth.js";

const app = express();
app.use(express.json());

// CORS設定（Manager アプリからのアクセスを許可）
app.use((req, res, next) => {
  const origin = process.env.MANAGER_URL || "http://localhost:3000";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, api-key",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// 認証関連のルートを追加
app.use("/auth", authRoutes);

// コールバック関連のルートを追加
app.use("/", callbackRoutes);

// セッションIDをキーとしてトランスポートを保存
const transports: Record<string, SSEServerTransport> = {};
// トランスポートの最終アクティビティタイムスタンプを記録
const lastActivity: Record<string, number> = {};

/** SSE接続のタイムアウト設定（ミリ秒）　60秒 */
const CONNECTION_TIMEOUT = 60 * 1000;
/** キープアライブの間隔（ミリ秒）　30秒 */
const KEEPALIVE_INTERVAL = 30 * 1000;

app.get("/", (_req, res) => {
  console.log("Received GET request to /");
  res.send("MCP Proxy Server is running. Use /mcp to establish an SSE stream.");
});

// SSE endpoint for establishing the stream
app.get("/mcp", requireAuthWithRedirect, async (req: Request, res: Response) => {
  console.log("Received GET request to /sse (establishing SSE stream)");

  // 認証されたユーザー情報を取得
  const user = (req as AuthenticatedRequest).user;
  const userId = user.id;

  console.log("Authenticated user:", { id: userId, email: user.email });

  try {
    // Create a new SSE transport for the client
    // POST メッセージのエンドポイントは '/messages'
    const transport = new SSEServerTransport("/messages", res);

    // セッションIDをキーとしてトランスポートを保存
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;
    // 初期アクティビティタイムスタンプを設定
    lastActivity[sessionId] = Date.now();

    const { server, cleanup } = await getServer(userId, user);

    // トランスポートが閉じられたときにクリーンアップを行うハンドラを設定
    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      delete transports[sessionId];
      delete lastActivity[sessionId];
      void cleanup();
    };

    // クライアント切断検出用のイベントハンドラを追加
    res.on("close", () => {
      console.log(`Client disconnected for session ${sessionId}`);
      void cleanupSession(sessionId);
    });

    // キープアライブメッセージを送信する設定
    const keepAliveInterval = setInterval(() => {
      try {
        if (transports[sessionId]) {
          // コメントイベントを送信（クライアントで無視される）
          res.write(": keepalive\n\n");
          lastActivity[sessionId] = Date.now();
        } else {
          clearInterval(keepAliveInterval);
        }
      } catch (error) {
        console.error(
          `Error sending keepalive for session ${sessionId}:`,
          error,
        );
        void cleanupSession(sessionId);
        clearInterval(keepAliveInterval);
      }
    }, KEEPALIVE_INTERVAL);

    await server.connect(transport);

    console.log(`Established SSE stream with session ID: ${sessionId}`);
  } catch (error) {
    console.error("Error establishing SSE stream:", error);
    if (!res.headersSent) {
      res.status(500).send("Error establishing SSE stream");
    }
  }
});

// Messages endpoint for receiving client JSON-RPC requests
app.post("/messages", async (req: Request, res: Response) => {
  console.log("Received POST request to /messages");

  // Extract session ID from URL query parameter
  // In the SSE protocol, this is added by the client based on the endpoint event
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    console.error("No session ID provided in request URL");
    res.status(400).send("Missing sessionId parameter");
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    console.error(`No active transport found for session ID: ${sessionId}`);
    res.status(404).send("Session not found");
    return;
  }

  try {
    // アクティビティタイムスタンプを更新
    lastActivity[sessionId] = Date.now();

    // Handle the POST message with the transport
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error("Error handling request:", error);
    if (!res.headersSent) {
      res.status(500).send("Error handling request");
    }
  }
});

// セッションをクリーンアップする関数
async function cleanupSession(sessionId: string) {
  if (transports[sessionId]) {
    console.log(`Cleaning up inactive session ${sessionId}`);
    try {
      await transports[sessionId].close();
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
    delete transports[sessionId];
    delete lastActivity[sessionId];
  }
}

// 定期的なセッションクリーンアップの実行
setInterval(() => {
  const now = Date.now();

  for (const sessionId in lastActivity) {
    const lastActiveTime = lastActivity[sessionId];
    if (lastActiveTime && now - lastActiveTime > CONNECTION_TIMEOUT) {
      void cleanupSession(sessionId);
    }
  }
}, CONNECTION_TIMEOUT / 2);

// システムヘルスチェックの定期実行（5分ごと）
setInterval(
  () => {
    const sessionCount = Object.keys(transports).length;
    logSystemHealth(sessionCount);
  },
  5 * 60 * 1000,
);

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`MCP Proxy Server listening on port ${PORT}`);
  console.log(
    `Ready to accept SSE connections at http://localhost:${PORT}/mcp`,
  );
});

// Handle server shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");

  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      void cleanupSession(sessionId);
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log("Server shutdown complete");
  process.exit(0);
});
