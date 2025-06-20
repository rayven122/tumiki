import { type Request, type Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { getServer } from "../proxy/getServer.js";
import { messageQueuePool } from "../../infrastructure/utils/objectPool.js";
import {
  type ConnectionInfo,
  KEEPALIVE_INTERVAL,
  registerConnection,
  cleanupConnection,
  recordConnectionError,
  connections,
} from "./connectionManager.js";
import {
  attemptConnectionRecovery,
  checkConnectionHealth,
  ConnectionState,
} from "./recoveryManager.js";

/**
 * SSE接続の確立
 */
export const establishConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // request header から apiKeyId を取得
  const apiKeyId = (req.query["api-key"] ?? req.headers["api-key"]) as
    | string
    | undefined;
  const clientId =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  console.log("apiKeyId", apiKeyId);
  console.log("clientId", clientId);

  if (!apiKeyId) {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    // Create a new SSE transport for the client
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    const now = Date.now();

    // メッセージキューをプールから取得
    const messageQueue = messageQueuePool.acquire();

    const { server } = await getServer(apiKeyId);

    // 接続情報を作成
    const connectionInfo: ConnectionInfo = {
      transport,
      lastActivity: now,
      clientId,
      messageQueue,
      isProcessing: false,
      // 回復機能用フィールド
      connectionStartTime: now,
      lastHealthCheck: now,
      errorCount: 0,
      apiKeyId,
    };

    // 接続を登録
    registerConnection(sessionId, connectionInfo);

    // トランスポートが閉じられたときのクリーンアップ
    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      void cleanupConnection(sessionId);
    };

    // クライアント切断検出
    res.on("close", () => {
      console.log(`Client disconnected for session ${sessionId}`);
      void cleanupConnection(sessionId);
    });

    res.on("error", (error) => {
      console.error(`SSE connection error for session ${sessionId}:`, error);
      recordConnectionError(sessionId, error);
      void cleanupConnection(sessionId);
    });

    // 強化されたキープアライブとヘルスチェック
    const keepAliveInterval = setInterval(() => {
      const conn = connections.get(sessionId);
      if (!conn) {
        clearInterval(keepAliveInterval);
        return;
      }

      // 接続の健全性をチェック
      const healthState = checkConnectionHealth(sessionId);
      conn.lastHealthCheck = Date.now();

      try {
        // キープアライブメッセージの送信
        res.write(": keepalive\\n\\n");
        conn.lastActivity = Date.now();

        // 接続状態のログ出力（劣化状態の場合）
        if (healthState === ConnectionState.DEGRADED) {
          console.warn(`Connection ${sessionId} is in degraded state`);
        }
      } catch (error) {
        console.error(
          `Error sending keepalive for session ${sessionId}:`,
          error,
        );
        recordConnectionError(sessionId, error as Error);

        // 回復を試行
        void attemptConnectionRecovery(sessionId, async () => {
          // 新しい接続を試行する場合の処理
          // 現在の実装では単純にクリーンアップ
          return false;
        }).then((recovered) => {
          if (!recovered) {
            void cleanupConnection(sessionId);
          }
        });

        clearInterval(keepAliveInterval);
      }
    }, KEEPALIVE_INTERVAL);

    connectionInfo.keepAliveInterval = keepAliveInterval;

    await server.connect(transport);

    console.log(
      `Established SSE stream with session ID: ${sessionId}, total connections: ${connections.size}`,
    );
  } catch (error) {
    console.error("Error establishing SSE stream:", error);
    if (!res.headersSent) {
      res.status(500).send("Error establishing SSE stream");
    }
  }
};
