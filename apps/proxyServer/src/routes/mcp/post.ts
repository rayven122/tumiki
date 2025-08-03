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
import { TransportType } from "@tumiki/db";
import { logger } from "../../libs/logger.js";
import { logMcpRequest } from "../../libs/requestLogger.js";

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

  // 検証モードの判定
  const isValidationMode = req.headers["x-validation-mode"] === "true";

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
        isValidationMode,
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

    await transport.handleRequest(req, res, requestBody);
    success = true;
  } catch (error) {
    logger.error("Error handling transport request", {
      sessionId: transport.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (!res.headersSent) {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32603,
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
    if (!isValidationMode) {
      // 非同期でログ記録（レスポンス返却をブロックしない）
      logMcpRequest({
        userId: undefined,
        mcpServerInstanceId: undefined, // HTTP transportでは特定できない場合がある
        toolName: "http_transport",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: req.method,
        responseStatus: success ? "200" : "500",
        durationMs,
        inputBytes,
        outputBytes,
        organizationId: undefined,
        // 詳細ログ記録を追加（サイズ制限付き）
        requestData: requestData,
        responseData: responseDataForLog || undefined,
      }).catch((error) => {
        logger.error("Failed to log HTTP transport request", {
          error: error instanceof Error ? error.message : String(error),
          sessionId: transport.sessionId,
        });
      });
    }
  }
};
