import { type Request, type Response } from "express";
import { handlePOSTRequest } from "./post.js";
import { handleGETRequest } from "./get.js";
import { handleDELETERequest } from "./delete.js";
import { logger } from "../../libs/logger.js";
import { validateAuth } from "../../libs/authMiddleware.js";
import { sendAuthErrorResponse } from "../../utils/errorResponse.js";

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
  const clientId: string =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  logger.info("MCP request received", {
    method,
    sessionId,
    clientId,
    userAgent: req.headers["user-agent"],
  });

  // Unified authentication validation
  const authResult = await validateAuth(req);

  if (!authResult.valid) {
    sendAuthErrorResponse(
      res,
      `Invalid API key or Bearer token - ${authResult.error}`,
    );
    return;
  }

  const apiKey = authResult.apiKey.apiKey;

  try {
    switch (method) {
      case "POST":
        await handlePOSTRequest(req, res, sessionId, apiKey, clientId);
        break;
      case "GET":
        await handleGETRequest(req, res, sessionId, apiKey, clientId);
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
