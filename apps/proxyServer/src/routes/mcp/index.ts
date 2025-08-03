import { type Request, type Response } from "express";
import { handlePOSTRequest } from "./post.js";
import { handleGETRequest } from "./get.js";
import { handleDELETERequest } from "./delete.js";
import { logger } from "../../libs/logger.js";

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

  // OAuth認証を使用するかどうかをチェック
  const useOAuth =
    req.query.useOAuth === "true" || req.query.use_oauth === "true";

  // APIキーの取得（OAuth認証を使用しない場合のみ必要）
  const apiKey: string | undefined = useOAuth
    ? undefined
    : (req.query["api-key"] as string) ||
      (req.headers["api-key"] as string) ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : undefined);

  logger.info("MCP request received", {
    method,
    sessionId,
    hasApiKey: !!apiKey,
    useOAuth,
    clientId,
    userAgent: req.headers["user-agent"],
  });

  // OAuth認証を使用しない場合のAPIキー検証
  if (!useOAuth && !apiKey) {
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
        await handlePOSTRequest(req, res, sessionId, apiKey || "", clientId);
        break;
      case "GET":
        await handleGETRequest(req, res, sessionId, apiKey || "", clientId);
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
