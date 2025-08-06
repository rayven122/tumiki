import { type Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/integratedAuth.js";
import { getStreamableTransportBySessionId } from "../../utils/transport.js";
import { updateSessionActivity, isSessionValid } from "../../utils/session.js";
import { toMcpRequest } from "../../utils/mcpAdapter.js";

/**
 * GET リクエスト処理 - SSE ストリーム（オプション）
 */
export const handleGETRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  sessionId: string | undefined,
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
    await transport.handleRequest(toMcpRequest(req), res);
  } catch {
    if (!res.headersSent) {
      res.status(500).send("SSE stream error");
    }
  }
};
