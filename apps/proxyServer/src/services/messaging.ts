import { type Request, type Response } from "express";
import { connections, cleanupConnection } from "./connection.js";

/**
 * POSTメッセージを処理
 */
export const handleMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  console.log("Received POST request to /messages");

  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    console.error("No session ID provided in request URL");
    res.status(400).json({ error: "Missing sessionId parameter" });
    return;
  }

  const connection = connections.get(sessionId);
  if (!connection) {
    console.error(`No active connection found for session ID: ${sessionId}`);
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    // アクティビティタイムスタンプを更新
    connection.lastActivity = Date.now();

    // Handle the POST message with the transport
    await connection.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error("Error handling request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error handling request" });
    }
    // エラー時は接続をクリーンアップ
    void cleanupConnection(sessionId);
  }
};