import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { type SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SSEServerTransport as SSEServerTransportClass } from "@modelcontextprotocol/sdk/server/sse.js";
import { type Response } from "express";
import { toMcpRequest } from "./mcpAdapter.js";
import { messageQueuePool } from "../libs/utils.js";
import { getServer } from "./proxy.js";
import type { AuthenticatedRequest } from "../middleware/integratedAuth.js";
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
  type SessionInfo,
} from "./session.js";
import { TransportType as PrismaTransportType } from "@tumiki/db";

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
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  // 認証情報は統合認証ミドルウェアから取得
  const authInfo = req.authInfo;
  if (!authInfo) {
    sendErrorResponse(
      res,
      401,
      "Unauthorized: Authentication required",
      "AUTHENTICATION_REQUIRED",
      "Authentication information is missing",
    );
    return;
  }

  const clientId =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  // 検証モードの判定
  const isValidationMode = req.headers["x-validation-mode"] === "true";

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
  const rollbackOnError = async (_error: Error, _step: string) => {
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
        } catch (closeError) {}
      }
    } catch (rollbackError) {}
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
        authInfo.userMcpServerInstanceId || "",
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
              } catch (error) {}
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
      const serverResult = await getServer(
        authInfo.userMcpServerInstanceId || "",
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
      // クリーンアップ中でない場合のみ実行
      if (!isCleaningUp && session) {
        void session.cleanup?.();
      }
    };

    // クライアント切断検出
    res.on("close", () => {
      if (!isCleaningUp && session) {
        void session.cleanup?.();
      }
    });

    res.on("error", (_error) => {
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
        clearInterval(keepAliveInterval);
        if (!isCleaningUp && session?.cleanup) {
          void session.cleanup();
        }
      }
    }, 30000); // 30秒ごと

    connectionInfo.keepAliveInterval = keepAliveInterval;
  } catch (error) {
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
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    sendErrorResponse(
      res,
      400,
      "Missing sessionId parameter",
      "MISSING_SESSION_ID",
    );
    return;
  }

  if (!isSessionValid(sessionId)) {
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
    sendErrorResponse(res, 404, "Session not found", "SESSION_NOT_FOUND");
    return;
  }

  try {
    // メトリクス付きでメッセージ処理を実行
    await measureTransportExecutionTime(
      async () => {
        // アクティビティタイムスタンプを更新
        updateSessionActivity(sessionId);

        // Handle the POST message with the transport
        await connectionInfo.transport.handlePostMessage(
          toMcpRequest(req),
          res,
          req.body,
        );
      },
      "sse",
      "message_handling",
    );
  } catch (error) {
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
  userMcpServerInstanceId: string,
  clientId = "unknown",
): StreamableHTTPServerTransport => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => generateSessionId(),
    onsessioninitialized: (sessionId: string) => {
      // セッション作成（cleanup関数付き）
      createSessionWithId(
        sessionId,
        TransportType.STREAMABLE_HTTP,
        userMcpServerInstanceId,
        clientId,
        async () => {
          // Streamable HTTP接続のクリーンアップ
          const connectionInfo = streamableConnections.get(sessionId);
          await connectionInfo?.transport.close();
          streamableConnections.delete(sessionId);
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
