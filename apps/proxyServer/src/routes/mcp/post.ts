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
import { logMcpRequest } from "../../libs/requestLogger.js";
import { toMcpRequest } from "../../utils/mcpAdapter.js";
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

  // リクエストをtransportに転送（詳細ログ記録付き）
  const startTime = Date.now();
  let responseData: unknown = undefined;
  let success = false;

  try {
    // リクエストボディをキャプチャ
    const requestBody = req.body as unknown;

    // レスポンスをインターセプトするためのオリジナルjsonメソッドを保存
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      responseData = body;
      return originalJson(body);
    };

    await transport.handleRequest(toMcpRequest(req), res, requestBody);
    success = true;
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
      responseData = errorResponse;
      res.status(500).json(errorResponse);
    }
  } finally {
    // リクエスト完了時にログ記録
    const durationMs = Date.now() - startTime;

    // データサイズ制限チェック（圧縮前の生データサイズで5MB制限）
    const maxLogSize = 5 * 1024 * 1024; // 5MB（圧縮前）

    // リクエストデータのサイズチェック
    const requestStr = JSON.stringify(req.body || {});
    const requestData =
      requestStr.length > maxLogSize
        ? `[Data too large: ${requestStr.length} bytes]`
        : requestStr;

    // レスポンスデータのサイズチェック
    const responseStr = responseData ? JSON.stringify(responseData) : "";
    const responseDataForLog =
      responseStr.length > maxLogSize
        ? `[Data too large: ${responseStr.length} bytes]`
        : responseStr;

    const inputBytes = requestStr.length;
    const outputBytes = responseStr.length;

    // 検証モードでない場合のみログ記録
    if (
      !isValidationMode &&
      req.authInfo?.userMcpServerInstanceId &&
      req.authInfo?.organizationId
    ) {
      // 非同期でログ記録（レスポンス返却をブロックしない）
      void logMcpRequest({
        userId: req.authInfo.userId,
        mcpServerInstanceId: req.authInfo.userMcpServerInstanceId,
        toolName: "http_transport",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: req.method,
        responseStatus: success ? "200" : "500",
        durationMs,
        inputBytes,
        outputBytes,
        organizationId: req.authInfo.organizationId,
        // 詳細ログ記録を追加（サイズ制限付き）
        requestData: requestData,
        responseData: responseDataForLog || undefined,
      });
    }
  }
};
