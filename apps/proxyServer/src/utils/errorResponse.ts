import { type Response } from "express";

/**
 * JSON-RPC エラーコード定数
 * @see https://www.jsonrpc.org/specification#error_object
 */
export const JSON_RPC_ERROR_CODES = {
  // JSON-RPC 2.0 標準エラーコード
  PARSE_ERROR: -32700, // Parse error
  INVALID_REQUEST: -32600, // Invalid Request
  METHOD_NOT_FOUND: -32601, // Method not found
  INVALID_PARAMS: -32602, // Invalid params
  INTERNAL_ERROR: -32603, // Internal error

  // サーバー定義エラーコード (-32000 to -32099)
  SERVER_ERROR: -32000, // Generic server error
} as const;

export type JsonRpcErrorCode =
  (typeof JSON_RPC_ERROR_CODES)[keyof typeof JSON_RPC_ERROR_CODES];

/**
 * JSON-RPC エラーレスポンスを送信する共通関数
 * @param res Express Response オブジェクト
 * @param status HTTP ステータスコード
 * @param message エラーメッセージ
 * @param code JSON-RPC エラーコード (デフォルト: SERVER_ERROR)
 * @param id リクエストID (デフォルト: null)
 */
export const sendJsonRpcError = (
  res: Response,
  status: number,
  message: string,
  code: JsonRpcErrorCode = JSON_RPC_ERROR_CODES.SERVER_ERROR,
  id: string | number | null = null,
): void => {
  // レスポンスが既に送信されている場合は何もしない
  if (res.headersSent) {
    return;
  }

  res.status(status).json({
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
    id,
  });
};

/**
 * よく使用されるエラーレスポンスのヘルパー関数
 */
export const sendAuthenticationError = (
  res: Response,
  message = "Authentication required",
): void => {
  sendJsonRpcError(res, 401, message, JSON_RPC_ERROR_CODES.SERVER_ERROR);
};

export const sendBadRequestError = (res: Response, message: string): void => {
  sendJsonRpcError(res, 400, message, JSON_RPC_ERROR_CODES.INVALID_REQUEST);
};

export const sendNotFoundError = (res: Response, message: string): void => {
  sendJsonRpcError(res, 404, message, JSON_RPC_ERROR_CODES.SERVER_ERROR);
};

export const sendInternalError = (
  res: Response,
  message = "Internal server error",
): void => {
  sendJsonRpcError(res, 500, message, JSON_RPC_ERROR_CODES.INTERNAL_ERROR);
};

export const sendServiceUnavailableError = (
  res: Response,
  message = "Service unavailable",
): void => {
  sendJsonRpcError(res, 503, message, JSON_RPC_ERROR_CODES.SERVER_ERROR);
};

export const sendMethodNotAllowedError = (
  res: Response,
  method: string,
): void => {
  sendJsonRpcError(
    res,
    405,
    `Method ${method} not allowed`,
    JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND,
  );
};
