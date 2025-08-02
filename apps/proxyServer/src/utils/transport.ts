import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { type SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SSEServerTransport as SSEServerTransportClass } from "@modelcontextprotocol/sdk/server/sse.js";
import { type Request, type Response } from "express";
import { logger } from "../libs/logger.js";
import { messageQueuePool } from "../libs/utils.js";
import { getServer } from "./proxy.js";
import {
  measureTransportExecutionTime,
  recordTransportError,
  updateTransportConnectionCount,
} from "../libs/metrics.js";
import {
  TransportType,
  createSessionWithId,
  isSessionValid,
  generateSessionId,
  updateSessionActivity,
  canCreateNewSession,
  recordSessionError,
  type SessionInfo,
} from "./session.js";
import { TransportType as PrismaTransportType } from "@tumiki/db/prisma";
import { validateAuth, convertToMcpAuthInfo } from "../libs/authMiddleware.js";

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

// 統一エラーレスポンス関数
interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

const sendErrorResponse = (
  res: Response,
  status: number,
  error: string,
  code?: string,
  details?: string,
): void => {
  if (res.headersSent) {
    logger.warn("Attempted to send error response after headers sent", {
      status,
      error,
      code,
    });
    return;
  }

  const errorResponse: ErrorResponse = { error };
  if (code) errorResponse.code = code;
  if (details) errorResponse.details = details;

  res.status(status).json(errorResponse);
};

/**
 * SSE接続の確立
 */
export const establishSSEConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Unified authentication validation
  const authResult = await validateAuth(req);

  if (!authResult.valid) {
    sendErrorResponse(
      res,
      401,
      `Unauthorized: ${authResult.error}`,
      "AUTH_FAILED",
      authResult.authType,
    );
    return;
  }

  const { userMcpServerInstance, userId, authType } = authResult;

  logger.info("SSE authentication successful", {
    authType,
    instanceId: userMcpServerInstance?.id,
    userId,
  });

  // request header から apiKeyId を取得（後方互換性のため）
  const apiKeyId = (req.query["api-key"] ?? req.headers["api-key"]) as
    | string
    | undefined;
  const clientId =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  // 検証モードの判定
  const isValidationMode = req.headers["x-validation-mode"] === "true";

  logger.info("SSE connection request received", {
    apiKeyId: apiKeyId ? "***" : undefined,
    clientId,
    userAgent: req.headers["user-agent"],
  });

  if (!apiKeyId) {
    sendErrorResponse(
      res,
      401,
      "Unauthorized: Missing API key",
      "MISSING_API_KEY",
      "API key must be provided via query parameter or header",
    );
    return;
  }

  if (!canCreateNewSession()) {
    sendErrorResponse(
      res,
      503,
      "Server at capacity",
      "MAX_SESSIONS_REACHED",
      "Maximum number of concurrent sessions reached",
    );
    return;
  }

  let transport: SSEServerTransport | undefined;
  let messageQueue: unknown[] | undefined;
  let sessionId: string | undefined;
  let session: SessionInfo | undefined;

  // ロールバック用クリーンアップ関数
  const rollbackOnError = async (error: Error, step: string) => {
    logger.error("Rolling back SSE connection due to error", {
      sessionId,
      step,
      error: error.message,
      apiKeyId: "***",
      clientId,
    });

    try {
      if (sessionId) {
        // セッションを削除
        if (session?.cleanup) {
          await session.cleanup();
        }

        // SSE接続をクリーンアップ
        sseConnections.delete(sessionId);
      }

      if (messageQueue) {
        // メッセージキューをプールに返却
        messageQueuePool.release(messageQueue);
      }

      if (transport) {
        // transportを閉じる
        try {
          transport.onclose = undefined;
          await transport.close();
        } catch (closeError) {
          logger.warn("Error closing transport during rollback", {
            sessionId,
            error:
              closeError instanceof Error
                ? closeError.message
                : String(closeError),
          });
        }
      }
    } catch (rollbackError) {
      logger.error("Error during rollback", {
        sessionId,
        error:
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
      });
    }
  };

  try {
    // Create a new SSE transport for the client
    transport = new SSEServerTransportClass("/messages", res);
    sessionId = transport.sessionId;

    // メッセージキューをプールから取得
    messageQueue = messageQueuePool.acquire();

    // クリーンアップフラグを使用して循環参照を防止
    let isCleaningUp = false;

    // transportのsessionIdを使用してセッション作成（cleanup関数付き）
    try {
      session = createSessionWithId(
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
            const connectionInfo = sessionId
              ? sseConnections.get(sessionId)
              : undefined;
            if (connectionInfo) {
              if (connectionInfo.keepAliveInterval) {
                clearInterval(connectionInfo.keepAliveInterval);
              }

              // transport.close()を呼ぶ前に接続マップから削除
              if (sessionId) {
                sseConnections.delete(sessionId);
              }
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
    } catch (sessionError) {
      await rollbackOnError(sessionError as Error, "session_creation");
      throw sessionError;
    }

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
    let server;
    try {
      // OAuth認証の場合もAPIキーを使用（getServerの互換性のため）
      const serverApiKey =
        authType === "oauth" && userMcpServerInstance?.apiKeys?.[0]
          ? userMcpServerInstance.apiKeys[0].apiKey
          : apiKeyId;

      const serverResult = await getServer(
        serverApiKey,
        PrismaTransportType.SSE,
        isValidationMode,
      );
      server = serverResult.server;
      await server.connect(transport);
    } catch (serverError) {
      await rollbackOnError(serverError as Error, "server_connection");
      throw serverError;
    }

    // トランスポートが閉じられたときのクリーンアップ（循環参照防止）
    transport.onclose = () => {
      logger.info("SSE transport closed", { sessionId });
      // クリーンアップ中でない場合のみ実行
      if (!isCleaningUp && session) {
        void session.cleanup?.();
      }
    };

    // クライアント切断検出
    res.on("close", () => {
      logger.info("SSE client disconnected", { sessionId });
      if (!isCleaningUp && session) {
        void session.cleanup?.();
      }
    });

    res.on("error", (error) => {
      logger.error("SSE connection error", {
        sessionId,
        error: error.message,
      });
      if (sessionId) {
        recordSessionError(sessionId);
      }
      if (!isCleaningUp && session?.cleanup) {
        void session.cleanup();
      }
    });

    // キープアライブの設定
    const keepAliveInterval = setInterval(() => {
      if (!sessionId || !isSessionValid(sessionId)) {
        clearInterval(keepAliveInterval);
        if (session?.cleanup) {
          void session.cleanup();
        }
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
        if (sessionId) {
          recordSessionError(sessionId);
        }
        clearInterval(keepAliveInterval);
        if (!isCleaningUp && session?.cleanup) {
          void session.cleanup();
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
      stack: error instanceof Error ? error.stack : undefined,
      apiKeyId: "***",
      clientId,
    });

    sendErrorResponse(
      res,
      500,
      "Failed to establish SSE connection",
      "CONNECTION_FAILED",
      error instanceof Error ? error.message : "Unknown error occurred",
    );
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
    sendErrorResponse(
      res,
      400,
      "Missing sessionId parameter",
      "MISSING_SESSION_ID",
    );
    return;
  }

  if (!isSessionValid(sessionId)) {
    logger.error("Invalid or expired session", { sessionId });
    sendErrorResponse(
      res,
      404,
      "Invalid or expired session",
      "INVALID_SESSION",
    );
    return;
  }

  const connectionInfo = sseConnections.get(sessionId);
  if (!connectionInfo) {
    logger.error("No SSE connection found for session", { sessionId });
    sendErrorResponse(res, 404, "Session not found", "SESSION_NOT_FOUND");
    return;
  }

  try {
    // メトリクス付きでメッセージ処理を実行
    await measureTransportExecutionTime(
      async () => {
        // アクティビティタイムスタンプを更新
        updateSessionActivity(sessionId);

        // セッション情報から認証情報を再構築
        const authResult = await validateAuth(req);

        // リクエストにauth情報を追加
        const bearerToken = req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.substring(7)
          : undefined;
        const authInfo = convertToMcpAuthInfo(authResult, bearerToken);

        // 新しいオブジェクトにauth情報を追加（型競合を回避）
        const reqWithAuth = Object.assign({}, req, {
          auth: authInfo,
        });

        // Handle the POST message with the transport
        await connectionInfo.transport.handlePostMessage(
          reqWithAuth,
          res,
          req.body,
        );
      },
      "sse",
      "message_handling",
    );
  } catch (error) {
    logger.error("Error handling SSE message", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    recordSessionError(sessionId);
    recordTransportError("sse", "message_handling_failed");

    sendErrorResponse(
      res,
      500,
      "Error handling SSE message",
      "MESSAGE_HANDLING_FAILED",
      error instanceof Error ? error.message : "Unknown error occurred",
    );
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
      createSessionWithId(
        sessionId,
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
  const stats = {
    totalConnections: sseConnections.size,
    activeConnections: Array.from(sseConnections.values()).filter((conn) =>
      isSessionValid(conn.sessionId),
    ).length,
  };

  // メトリクス更新
  updateTransportConnectionCount("sse", stats.totalConnections);

  return stats;
};

/**
 * Streamable HTTP接続統計を取得
 */
export const getStreamableConnectionStats = () => {
  const stats = {
    totalConnections: streamableConnections.size,
    activeConnections: Array.from(streamableConnections.values()).filter(
      (conn) => isSessionValid(conn.sessionId),
    ).length,
  };

  // メトリクス更新
  updateTransportConnectionCount("streamableHttp", stats.totalConnections);

  return stats;
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
