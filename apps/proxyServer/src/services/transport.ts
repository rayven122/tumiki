import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "../lib/logger.js";
import {
  TransportType,
  createSession,
  isSessionValid,
  generateSessionId,
} from "./session.js";

// Streamable HTTP接続情報
export interface StreamableHTTPConnectionInfo {
  transport: StreamableHTTPServerTransport;
  sessionId: string;
}

// Streamable HTTP接続管理
export const streamableConnections = new Map<
  string,
  StreamableHTTPConnectionInfo
>();

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
      };

      streamableConnections.set(sessionId, connectionInfo);
    },
  });

  return transport;
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
