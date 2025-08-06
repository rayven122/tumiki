import type { Response } from "express";
import { handlePOSTRequest } from "./post.js";
import { handleGETRequest } from "./get.js";
import { handleDELETERequest } from "./delete.js";
import type { AuthenticatedRequest } from "../../middleware/integratedAuth.js";

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
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Unauthorized: Authentication required",
      },
      id: null,
    });
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
        res.status(405).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `Method ${method} not allowed`,
          },
          id: null,
        });
    }
  } catch {
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
