import { type Request, type Response } from "express";
import { type StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  createStreamableTransport,
  getTransportBySessionId,
  updateSessionActivity,
  isSessionValid,
  canCreateNewSession,
} from "../services/transport.js";
import { getServer } from "../services/proxy.js";
import { logger } from "../lib/logger.js";

/**
 * 統合MCPエンドポイント - Streamable HTTP transport
 * すべてのMCP通信がこのエンドポイントを通る
 */
export const handleMCPRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const method = req.method;
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const apiKeyId = (req.query["api-key"] ?? req.headers["api-key"]) as
    | string
    | undefined;
  const clientId =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  logger.info("MCP request received", {
    method,
    sessionId,
    apiKeyId: apiKeyId ? "***" : undefined,
    clientId,
    userAgent: req.headers["user-agent"],
  });

  // API key validation
  if (!apiKeyId) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Unauthorized: Missing API key",
      },
      id: null,
    });
    return;
  }

  try {
    switch (method) {
      case "POST":
        await handlePOSTRequest(req, res, sessionId, apiKeyId, clientId);
        break;
      case "GET":
        await handleGETRequest(req, res, sessionId, apiKeyId, clientId);
        break;
      case "DELETE":
        await handleDELETERequest(req, res, sessionId);
        break;
      default:
        res.status(405).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `Method ${method} not allowed`,
          },
          id: null,
        });
    }
  } catch (error) {
    logger.error("Error handling MCP request", {
      method,
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
        },
        id: null,
      });
    }
  }
};

/**
 * POST リクエスト処理 - JSON-RPC メッセージ
 */
const handlePOSTRequest = async (
  req: Request,
  res: Response,
  sessionId: string | undefined,
  apiKeyId: string,
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

    const existingTransport = getTransportBySessionId(sessionId);
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

    transport = createStreamableTransport(apiKeyId);
    isNewSession = true;
  }

  // MCPサーバーとの接続確立（新しいセッションの場合）
  if (isNewSession) {
    try {
      const { server } = await getServer(apiKeyId);
      await server.connect(transport);

      logger.info("New MCP session established", {
        sessionId: transport.sessionId,
        apiKeyId: "***",
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

/**
 * GET リクエスト処理 - SSE ストリーム（オプション）
 */
const handleGETRequest = async (
  req: Request,
  res: Response,
  sessionId: string | undefined,
  apiKeyId: string,
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

  const transport = getTransportBySessionId(sessionId);
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

/**
 * DELETE リクエスト処理 - セッション終了
 */
const handleDELETERequest = async (
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

  const transport = getTransportBySessionId(sessionId);
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
    await transport.handleRequest(req, res);

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
