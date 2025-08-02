import { type Request, type Response } from "express";
import { getStreamableTransportBySessionId } from "../../utils/transport.js";
import { logger } from "../../libs/logger.js";

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
    // リクエストにauth情報を追加（MCP SDK向け）
    const mcpReq = req as typeof req & {
      mcpAuth?: { token: string; clientId: string; scopes: string[] };
    };

    // 新しいオブジェクトにauth情報を追加（型競合を回避）
    const reqWithAuth = Object.assign({}, mcpReq, {
      auth: mcpReq.mcpAuth,
    });

    // セッション終了処理をtransportに委譲
    await transport.handleRequest(reqWithAuth, res);

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
