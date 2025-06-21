import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { type SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SSEServerTransport as SSEServerTransportClass } from "@modelcontextprotocol/sdk/server/sse.js";
import { type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { messageQueuePool } from "../lib/utils.js";
import { getServer } from "./proxy.js";
import {
  TransportType,
  createSession,
  createSessionWithId,
  isSessionValid,
  generateSessionId,
  updateSessionActivity,
  canCreateNewSession,
  recordSessionError,
} from "./session.js";

// Transport types
export enum TransportImplementation {
  SSE = "sse",
  STREAMABLE_HTTP = "streamable_http",
}

// Base connection interface
export interface BaseConnectionInfo {
  sessionId: string;
  transportType: TransportImplementation;
}

// SSE connection info
export interface SSEConnectionInfo extends BaseConnectionInfo {
  transport: SSEServerTransport;
  transportType: TransportImplementation.SSE;
  messageQueue: unknown[];
  isProcessing: boolean;
  keepAliveInterval?: NodeJS.Timeout;
}

// Streamable HTTP connection info
export interface StreamableHTTPConnectionInfo extends BaseConnectionInfo {
  transport: StreamableHTTPServerTransport;
  transportType: TransportImplementation.STREAMABLE_HTTP;
}

// Union type for all connection types
export type ConnectionInfo = SSEConnectionInfo | StreamableHTTPConnectionInfo;

// Connection management
export const sseConnections = new Map<string, SSEConnectionInfo>();
export const streamableConnections = new Map<
  string,
  StreamableHTTPConnectionInfo
>();

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

    // クリーンアップフラグを使用して循環参照を防止
    let isCleaningUp = false;

    // transportのsessionIdを使用してセッション作成（cleanup関数付き）
    const session = createSessionWithId(
      sessionId,
      TransportType.SSE,
      apiKeyId,
      clientId,
      async () => {
        // 既にクリーンアップ中の場合は処理をスキップ
        if (isCleaningUp) {
          return;
        }
        isCleaningUp = true;

        try {
          // SSE接続のクリーンアップ
          const connectionInfo = sseConnections.get(sessionId);
          if (connectionInfo) {
            if (connectionInfo.keepAliveInterval) {
              clearInterval(connectionInfo.keepAliveInterval);
            }

            // transport.close()を呼ぶ前に接続マップから削除
            sseConnections.delete(sessionId);
            messageQueuePool.release(connectionInfo.messageQueue);

            // transportのcloseは最後に実行（循環参照を避けるため）
            try {
              // oncloseイベントハンドラーを無効化
              connectionInfo.transport.onclose = undefined;
              await connectionInfo.transport.close();
            } catch (error) {
              logger.warn("Error closing SSE transport", {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        } finally {
          isCleaningUp = false;
        }
      },
    );

    // SSE接続情報を保存
    const connectionInfo: SSEConnectionInfo = {
      transport,
      sessionId,
      transportType: TransportImplementation.SSE,
      messageQueue,
      isProcessing: false,
    };

    sseConnections.set(sessionId, connectionInfo);

    // MCPサーバーとの接続確立
    const { server } = await getServer(apiKeyId);
    await server.connect(transport);

    // トランスポートが閉じられたときのクリーンアップ（循環参照防止）
    transport.onclose = () => {
      logger.info("SSE transport closed", { sessionId });
      // クリーンアップ中でない場合のみ実行
      if (!isCleaningUp) {
        void session.cleanup?.();
      }
    };

    // クライアント切断検出
    res.on("close", () => {
      logger.info("SSE client disconnected", { sessionId });
      if (!isCleaningUp) {
        void session.cleanup?.();
      }
    });

    res.on("error", (error) => {
      logger.error("SSE connection error", {
        sessionId,
        error: error.message,
      });
      recordSessionError(sessionId);
      if (!isCleaningUp) {
        void session.cleanup?.();
      }
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
        if (!isCleaningUp) {
          void session.cleanup?.();
        }
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
 * 新しいStreamableHTTPServerTransportを作成
 */
export const createStreamableTransport = (
  apiKeyId: string,
  clientId = "unknown",
): StreamableHTTPServerTransport => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => generateSessionId(),
    onsessioninitialized: (sessionId: string) => {
      logger.info("StreamableHTTP session initialized", {
        sessionId,
        apiKeyId: "***",
        clientId,
      });

      // セッション作成（cleanup関数付き）
      createSession(
        TransportType.STREAMABLE_HTTP,
        apiKeyId,
        clientId,
        async () => {
          // Streamable HTTP接続のクリーンアップ
          const connectionInfo = streamableConnections.get(sessionId);
          if (connectionInfo) {
            try {
              // transport固有のクリーンアップ処理があれば実行
              logger.info("Cleaning up StreamableHTTP connection", {
                sessionId,
              });
            } catch (error) {
              logger.warn("Error cleaning up StreamableHTTP transport", {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
            streamableConnections.delete(sessionId);
          }
        },
      );

      // Streamable HTTP接続情報を保存
      const connectionInfo: StreamableHTTPConnectionInfo = {
        transport,
        sessionId,
        transportType: TransportImplementation.STREAMABLE_HTTP,
      };

      streamableConnections.set(sessionId, connectionInfo);
    },
  });

  return transport;
};

/**
 * セッションIDからSSE transportを取得
 */
export const getSSETransportBySessionId = (
  sessionId: string,
): SSEServerTransport | undefined => {
  const connectionInfo = sseConnections.get(sessionId);
  return connectionInfo?.transport;
};

/**
 * セッションIDからStreamable HTTP transportを取得
 */
export const getStreamableTransportBySessionId = (
  sessionId: string,
): StreamableHTTPServerTransport | undefined => {
  const connectionInfo = streamableConnections.get(sessionId);
  return connectionInfo?.transport;
};

/**
 * セッションIDから適切なtransportを取得（型を問わず）
 */
export const getTransportBySessionId = (
  sessionId: string,
): SSEServerTransport | StreamableHTTPServerTransport | undefined => {
  // SSE接続から検索
  const sseConnection = sseConnections.get(sessionId);
  if (sseConnection) {
    return sseConnection.transport;
  }

  // Streamable HTTP接続から検索
  const streamableConnection = streamableConnections.get(sessionId);
  if (streamableConnection) {
    return streamableConnection.transport;
  }

  return undefined;
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

/**
 * Streamable HTTP接続統計を取得
 */
export const getStreamableConnectionStats = () => {
  return {
    totalConnections: streamableConnections.size,
    activeConnections: Array.from(streamableConnections.values()).filter(
      (conn) => isSessionValid(conn.sessionId),
    ).length,
  };
};

/**
 * 全Transport統計を取得
 */
export const getAllTransportStats = () => {
  const sseStats = getSSEConnectionStats();
  const streamableStats = getStreamableConnectionStats();

  return {
    sse: sseStats,
    streamableHttp: streamableStats,
    total: {
      totalConnections:
        sseStats.totalConnections + streamableStats.totalConnections,
      activeConnections:
        sseStats.activeConnections + streamableStats.activeConnections,
    },
  };
};
