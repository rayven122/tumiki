import { type Request, type Response } from "express";
import { type StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  createStreamableTransport,
  getStreamableTransportBySessionId,
} from "../../utils/transport.js";
import {
  updateSessionActivity,
  isSessionValid,
  canCreateNewSession,
} from "../../utils/session.js";
import { getServer } from "../../utils/proxy.js";
import { TransportType } from "@tumiki/db/prisma";
import { logger } from "../../libs/logger.js";

/**
 * POST リクエスト処理 - JSON-RPC メッセージ
 */
export const handlePOSTRequest = async (
  req: Request,
  res: Response,
  sessionId: string | undefined,
  apiKey: string,
  clientId: string,
): Promise<void> => {
  let transport: StreamableHTTPServerTransport;
  let isNewSession = false;

  // セッションIDがある場合は既存セッションを確認
  if (sessionId) {
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

    const existingTransport = getStreamableTransportBySessionId(sessionId);
    if (!existingTransport) {
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
    transport = existingTransport;

    // セッションアクティビティを更新
    updateSessionActivity(sessionId, clientId);
  } else {
    // 新しいセッションの作成
    if (!canCreateNewSession()) {
      res.status(503).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Server at capacity",
        },
        id: null,
      });
      return;
    }

    transport = createStreamableTransport(apiKey, clientId);
    isNewSession = true;
  }

  // MCPサーバーとの接続確立（新しいセッションの場合）
  if (isNewSession) {
    try {
      const { server } = await getServer(
        apiKey,
        TransportType.STREAMABLE_HTTPS,
      );
      await server.connect(transport);

      logger.info("New MCP session established", {
        sessionId: transport.sessionId,
        hasApiKey: !!apiKey,
        clientId,
      });
    } catch (error) {
      logger.error("Failed to establish MCP connection", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Failed to establish MCP connection",
        },
        id: null,
      });
      return;
    }
  }

  // リクエストをtransportに転送
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error("Error handling transport request", {
      sessionId: transport.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Transport error",
        },
        id: null,
      });
    }
  }
};
