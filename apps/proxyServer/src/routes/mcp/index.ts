import type { Response } from "express";
import { handlePOSTRequest } from "./post.js";
import { handleGETRequest } from "./get.js";
import { handleDELETERequest } from "./delete.js";
import type { AuthenticatedRequest } from "../../middleware/integratedAuth.js";
import {
  sendAuthenticationError,
  sendMethodNotAllowedError,
  sendJsonRpcError,
  JSON_RPC_ERROR_CODES,
} from "../../utils/errorResponse.js";

/**
 * 統合MCPエンドポイント - Streamable HTTP transport
 * すべてのMCP通信がこのエンドポイントを通る
 */
export const handleMCPRequest = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const method = req.method;
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const clientId: string =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  // 認証情報は統合認証ミドルウェアから取得
  const authInfo = req.authInfo;
  if (!authInfo) {
    // このケースは通常発生しないはずだが、念のため
    sendAuthenticationError(res, "Unauthorized: Authentication required");
    return;
  }

  try {
    switch (method) {
      case "POST":
        await handlePOSTRequest(req, res, sessionId, clientId);
        break;
      case "GET":
        await handleGETRequest(req, res, sessionId, clientId);
        break;
      case "DELETE":
        await handleDELETERequest(req, res, sessionId);
        break;
      default:
        sendMethodNotAllowedError(res, method);
    }
  } catch {
    if (!res.headersSent) {
      sendJsonRpcError(
        res,
        500,
        "Internal error",
        JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
      );
    }
  }
};
