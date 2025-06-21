import { type Request, type Response } from "express";
import { type SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SSEServerTransport as SSEServerTransportClass } from "@modelcontextprotocol/sdk/server/sse.js";
import { getServer } from "./proxy.js";
import { messageQueuePool } from "../lib/utils.js";
import { logger } from "../lib/logger.js";
import {
  TransportType,
  createSession,
  updateSessionActivity,
  isSessionValid,
  canCreateNewSession,
  recordSessionError,
} from "./session.js";

// SSE接続情報
export interface SSEConnectionInfo {
  transport: SSEServerTransport;
  sessionId: string;
  messageQueue: unknown[];
  isProcessing: boolean;
  keepAliveInterval?: NodeJS.Timeout;
}

// SSE接続管理
export const sseConnections = new Map<string, SSEConnectionInfo>();

/**
 * SSE接続の確立
 */
export const establishSSEConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // request header から apiKeyId を取得
  const apiKeyId = (req.query["api-key"] ?? req.headers["api-key"]) as
    | string
    | undefined;
  const clientId =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  logger.info("SSE connection request received", {
    apiKeyId: apiKeyId ? "***" : undefined,
    clientId,
    userAgent: req.headers["user-agent"],
  });

  if (!apiKeyId) {
    res.status(401).send("Unauthorized: Missing API key");
    return;
  }

  if (!canCreateNewSession()) {
    res.status(503).send("Server at capacity");
    return;
  }

  try {
    // Create a new SSE transport for the client
    const transport = new SSEServerTransportClass("/messages", res);
    const sessionId = transport.sessionId;

    // メッセージキューをプールから取得
    const messageQueue = messageQueuePool.acquire();

    // セッション作成（cleanup関数付き）
    const session = createSession(
      TransportType.SSE,
      apiKeyId,
      clientId,
      async () => {
        // SSE接続のクリーンアップ
        const connectionInfo = sseConnections.get(sessionId);
        if (connectionInfo) {
          if (connectionInfo.keepAliveInterval) {
            clearInterval(connectionInfo.keepAliveInterval);
          }
          try {
            await connectionInfo.transport.close();
          } catch (error) {
            logger.warn("Error closing SSE transport", {
              sessionId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          messageQueuePool.release(connectionInfo.messageQueue);
          sseConnections.delete(sessionId);
        }
      },
    );

    // SSE接続情報を保存
    const connectionInfo: SSEConnectionInfo = {
      transport,
      sessionId,
      messageQueue,
      isProcessing: false,
    };

    sseConnections.set(sessionId, connectionInfo);

    // MCPサーバーとの接続確立
    const { server } = await getServer(apiKeyId);
    await server.connect(transport);

    // トランスポートが閉じられたときのクリーンアップ
    transport.onclose = () => {
      logger.info("SSE transport closed", { sessionId });
      void session.cleanup?.();
    };

    // クライアント切断検出
    res.on("close", () => {
      logger.info("SSE client disconnected", { sessionId });
      void session.cleanup?.();
    });

    res.on("error", (error) => {
      logger.error("SSE connection error", {
        sessionId,
        error: error.message,
      });
      recordSessionError(sessionId);
      void session.cleanup?.();
    });

    // キープアライブの設定
    const keepAliveInterval = setInterval(() => {
      if (!isSessionValid(sessionId)) {
        clearInterval(keepAliveInterval);
        void session.cleanup?.();
        return;
      }

      try {
        res.write(": keepalive\\n\\n");
        updateSessionActivity(sessionId, clientId);
      } catch (error) {
        logger.error("Error sending keepalive", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        recordSessionError(sessionId);
        clearInterval(keepAliveInterval);
        void session.cleanup?.();
      }
    }, 30000); // 30秒ごと

    connectionInfo.keepAliveInterval = keepAliveInterval;

    logger.info("SSE connection established", {
      sessionId,
      apiKeyId: "***",
      clientId,
    });
  } catch (error) {
    logger.error("Error establishing SSE connection", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      res.status(500).send("Error establishing SSE connection");
    }
  }
};

/**
 * SSEメッセージ処理
 */
export const handleSSEMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  logger.info("SSE message received");

  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    logger.error("No session ID provided in SSE message request");
    res.status(400).json({ error: "Missing sessionId parameter" });
    return;
  }

  if (!isSessionValid(sessionId)) {
    logger.error("Invalid or expired session", { sessionId });
    res.status(404).json({ error: "Invalid or expired session" });
    return;
  }

  const connectionInfo = sseConnections.get(sessionId);
  if (!connectionInfo) {
    logger.error("No SSE connection found for session", { sessionId });
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    // アクティビティタイムスタンプを更新
    updateSessionActivity(sessionId);

    // Handle the POST message with the transport
    await connectionInfo.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    logger.error("Error handling SSE message", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    recordSessionError(sessionId);

    if (!res.headersSent) {
      res.status(500).json({ error: "Error handling SSE message" });
    }
  }
};

/**
 * SSE接続統計を取得
 */
export const getSSEConnectionStats = () => {
  return {
    totalConnections: sseConnections.size,
    activeConnections: Array.from(sseConnections.values()).filter((conn) =>
      isSessionValid(conn.sessionId),
    ).length,
  };
};
