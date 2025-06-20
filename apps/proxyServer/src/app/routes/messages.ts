import { type Request, type Response } from "express";
import { connections } from "../../core/connection/connectionManager.js";
import { logger } from "../../infrastructure/utils/logger.js";

/**
 * POSTメッセージを処理するルートハンドラー
 */
export const handleMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  logger.info("Received POST request to /messages");

  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    logger.error("No session ID provided in request URL");
    res.status(400).json({ error: "Missing sessionId parameter" });
    return;
  }

  const connection = connections.get(sessionId);
  if (!connection) {
    logger.error("No active connection found for session ID", { sessionId });
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    // アクティビティタイムスタンプを更新
    connection.lastActivity = Date.now();

    // Handle the POST message with the transport
    await connection.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    logger.error("Error handling request", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      res.status(500).json({ error: "Error handling request" });
    }
    // エラー時は接続をクリーンアップ
    const { cleanupConnection } = await import(
      "../../core/connection/connectionManager.js"
    );
    void cleanupConnection(sessionId);
  }
};
