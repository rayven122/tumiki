import { type Request, type Response } from "express";
import { getStreamableTransportBySessionId } from "../../utils/transport.js";
import { logger } from "../../libs/logger.js";
import { toMcpRequest } from "../../utils/mcpAdapter.js";

/**
 * DELETE リクエスト処理 - セッション終了
 */
export const handleDELETERequest = async (
  req: Request,
  res: Response,
  sessionId: string | undefined,
): Promise<void> => {
  if (!sessionId) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Session ID required",
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

  try {
    // セッション終了処理をtransportに委譲
    await transport.handleRequest(toMcpRequest(req), res);

    logger.info("Session terminated", { sessionId });
  } catch (error) {
    logger.error("Error terminating session", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Error terminating session",
        },
        id: null,
      });
    }
  }
};
