import { type Request, type Response } from "express";
import { getStreamableTransportBySessionId } from "../../utils/transport.js";
import { updateSessionActivity, isSessionValid } from "../../utils/session.js";
import { logger } from "../../libs/logger.js";

/**
 * GET リクエスト処理 - SSE ストリーム（オプション）
 */
export const handleGETRequest = async (
  req: Request,
  res: Response,
  sessionId: string | undefined,
  apiKey: string,
  clientId: string,
): Promise<void> => {
  if (!sessionId) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Session ID required for SSE stream",
      },
      id: null,
    });
    return;
  }

  if (!isSessionValid(sessionId)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Invalid or expired session",
      },
      id: null,
    });
    return;
  }

  const transport = getStreamableTransportBySessionId(sessionId);
  if (!transport) {
    res.status(404).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Session not found",
      },
      id: null,
    });
    return;
  }

  // セッションアクティビティを更新
  updateSessionActivity(sessionId, clientId);

  // SSE ストリームとして処理
  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    logger.error("Error handling SSE stream", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (!res.headersSent) {
      res.status(500).send("SSE stream error");
    }
  }
};
