import { type Request, type Response } from "express";
import { handlePOSTRequest } from "./post.js";
import { handleGETRequest } from "./get.js";
import { handleDELETERequest } from "./delete.js";
import { logger } from "../../libs/logger.js";
import {
  validateAuth,
  convertToMcpAuthInfo,
} from "../../libs/authMiddleware.js";

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
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: `Unauthorized: ${authResult.error}`,
        data: { authType: authResult.authType },
      },
      id: null,
    });
    return;
  }

  const { userMcpServerInstance, userId, authType } = authResult;

  logger.info("Authentication successful", {
    authType,
    instanceId: userMcpServerInstance?.id,
    userId,
  });

  // Create API key for backward compatibility
  // OAuth認証の場合でも、既存のハンドラーが期待するAPIキー形式を生成
  const apiKey =
    authType === "oauth" && userMcpServerInstance?.apiKeys?.[0]
      ? userMcpServerInstance.apiKeys[0].apiKey
      : (req.query["api-key"] as string) ||
        (req.headers["api-key"] as string) ||
        "";

  // リクエストに認証情報を追加
  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.substring(7)
    : undefined;
  const authInfo = convertToMcpAuthInfo(authResult, bearerToken);

  // リクエストオブジェクトを拡張（mcpAuthとして別プロパティに設定）
  const enhancedReq = req as typeof req & { mcpAuth?: typeof authInfo };
  if (authInfo) {
    enhancedReq.mcpAuth = authInfo;
  }

  try {
    switch (method) {
      case "POST":
        await handlePOSTRequest(enhancedReq, res, sessionId, apiKey, clientId);
        break;
      case "GET":
        await handleGETRequest(enhancedReq, res, sessionId, apiKey, clientId);
        break;
      case "DELETE":
        await handleDELETERequest(enhancedReq, res, sessionId);
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
      authType,
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
