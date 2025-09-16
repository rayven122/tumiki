import { type Response } from "express";
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
import { TransportType } from "@tumiki/db";
import { toMcpRequest, ensureMcpAcceptHeader } from "../../utils/mcpAdapter.js";
import type { AuthenticatedRequest } from "../../middleware/integratedAuth.js";
import {
  sendBadRequestError,
  sendNotFoundError,
  sendAuthenticationError,
  sendServiceUnavailableError,
  sendJsonRpcError,
  JSON_RPC_ERROR_CODES,
} from "../../utils/errorResponse.js";

/**
 * POST リクエスト処理 - JSON-RPC メッセージ
 */
export const handlePOSTRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  sessionId: string | undefined,
  clientId: string,
): Promise<void> => {
  let transport: StreamableHTTPServerTransport;
  let isNewSession = false;

  // 検証モードの判定
  const isValidationMode = req.headers["x-validation-mode"] === "true";

  // セッションIDがある場合は既存セッションを確認
  if (sessionId) {
    if (!isSessionValid(sessionId)) {
      sendBadRequestError(res, "Invalid or expired session");
      return;
    }

    const existingTransport = getStreamableTransportBySessionId(sessionId);
    if (!existingTransport) {
      sendNotFoundError(res, "Session not found");
      return;
    }
    transport = existingTransport;

    // セッションアクティビティを更新
    updateSessionActivity(sessionId, clientId);
  } else {
    // 新しいセッションの作成
    if (!canCreateNewSession()) {
      sendServiceUnavailableError(res, "Server at capacity");
      return;
    }

    // 認証情報からuserMcpServerInstanceIdを取得（統合認証ミドルウェアで必ず設定される）
    if (!req.authInfo?.userMcpServerInstanceId) {
      sendAuthenticationError(res);
      return;
    }
    transport = createStreamableTransport(req.authInfo, clientId);
    isNewSession = true;
  }

  // MCPサーバーとの接続確立（新しいセッションの場合）
  if (isNewSession) {
    try {
      // isNewSessionがtrueの場合、78-88行で既にauthInfoの存在を確認済み
      const { server } = await getServer(
        req.authInfo!.userMcpServerInstanceId!,
        TransportType.STREAMABLE_HTTPS,
        isValidationMode,
      );
      await server.connect(transport);
    } catch {
      sendJsonRpcError(
        res,
        500,
        "Failed to establish MCP connection",
        JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
      );
      return;
    }
  }

  // リクエストをtransportに転送
  try {
    // リクエストボディをキャプチャ
    const requestBody = req.body as unknown;

    // Acceptヘッダーを確認・追加
    ensureMcpAcceptHeader(req);

    await transport.handleRequest(toMcpRequest(req), res, requestBody);
  } catch {
    if (!res.headersSent) {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
          message: "Transport error",
        },
        id: null,
      };
      res.status(500).json(errorResponse);
    }
  }
};
