import type { Request, Response } from "express";
import { getStreamableTransportBySessionId } from "../../utils/transport.js";
import { toMcpRequest, ensureMcpAcceptHeader } from "../../utils/mcpAdapter.js";
import {
  sendBadRequestError,
  sendNotFoundError,
  sendJsonRpcError,
  JSON_RPC_ERROR_CODES,
} from "../../utils/errorResponse.js";

/**
 * DELETE リクエスト処理 - セッション終了
 */
export const handleDELETERequest: (
  req: Request,
  res: Response,
  sessionId: string | undefined,
) => Promise<void> = async (req, res, sessionId) => {
  if (!sessionId) {
    sendBadRequestError(res, "Session ID required");
    return;
  }

  const transport = getStreamableTransportBySessionId(sessionId);
  if (!transport) {
    sendNotFoundError(res, "Session not found");
    return;
  }

  try {
    // Acceptヘッダーを確認・追加
    ensureMcpAcceptHeader(req);

    // セッション終了処理をtransportに委譲
    await transport.handleRequest(toMcpRequest(req), res);
  } catch {
    if (!res.headersSent) {
      sendJsonRpcError(
        res,
        500,
        "Error terminating session",
        JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
      );
    }
  }
};
