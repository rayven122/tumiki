import { type Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/integratedAuth.js";
import { getStreamableTransportBySessionId } from "../../utils/transport.js";
import { updateSessionActivity, isSessionValid } from "../../utils/session.js";
import { toMcpRequest, ensureMcpAcceptHeader } from "../../utils/mcpAdapter.js";
import {
  sendBadRequestError,
  sendNotFoundError,
} from "../../utils/errorResponse.js";

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
    sendBadRequestError(res, "Session ID required for SSE stream");
    return;
  }

  if (!isSessionValid(sessionId)) {
    sendBadRequestError(res, "Invalid or expired session");
    return;
  }

  const transport = getStreamableTransportBySessionId(sessionId);
  if (!transport) {
    sendNotFoundError(res, "Session not found");
    return;
  }

  // セッションアクティビティを更新
  updateSessionActivity(sessionId, clientId);

  // SSE ストリームとして処理
  try {
    // Acceptヘッダーを確認・追加
    ensureMcpAcceptHeader(req);

    await transport.handleRequest(toMcpRequest(req), res);
  } catch {
    if (!res.headersSent) {
      res.status(500).send("SSE stream error");
    }
  }
};
