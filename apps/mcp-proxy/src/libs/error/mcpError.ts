/**
 * MCP (JSON-RPC 2.0) エラー生成ユーティリティ
 */

import { error as jsonrpcError, JsonRpcError } from "jsonrpc-lite";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * JSON-RPC 2.0 ID型
 */
type JsonRpcId = string | number | null;

/**
 * JSON-RPC 2.0 エラーレスポンス型
 */
export type McpErrorResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

/**
 * 統一されたMCPエラーレスポンスを生成
 *
 * @param code - エラーコード（ErrorCodeを使用）
 * @param message - エラーメッセージ
 * @param data - 追加データ（オプション）
 * @param requestId - リクエストID（オプション）
 * @returns JSON-RPC 2.0 エラーレスポンス
 *
 * @example
 * ```ts
 * return c.json(createMcpError(ErrorCode.InternalError, "Invalid token"), 401);
 * ```
 */
export const createMcpError = (
  code: number,
  message: string,
  data?: unknown,
  requestId: JsonRpcId = null,
): McpErrorResponse => {
  const errorObj = jsonrpcError(
    requestId,
    new JsonRpcError(message, code, data),
  );
  return {
    jsonrpc: "2.0",
    id: errorObj.id,
    error: {
      code: errorObj.error.code,
      message: errorObj.error.message,
      ...(errorObj.error.data !== undefined && { data: errorObj.error.data }),
    },
  };
};

/**
 * 認証エラーレスポンスを生成
 * InvalidRequest (-32600) を使用
 */
export const createUnauthorizedError = (
  message = "Authentication required",
  data?: unknown,
): McpErrorResponse => {
  return createMcpError(ErrorCode.InvalidRequest, message, data);
};

/**
 * 権限拒否エラーレスポンスを生成
 * InvalidRequest (-32600) を使用
 */
export const createPermissionDeniedError = (
  message = "Permission denied",
  data?: unknown,
): McpErrorResponse => {
  return createMcpError(ErrorCode.InvalidRequest, message, data);
};

/**
 * 無効なリクエストエラーレスポンスを生成
 */
export const createInvalidRequestError = (
  message = "Invalid request",
  data?: unknown,
): McpErrorResponse => {
  return createMcpError(ErrorCode.InvalidRequest, message, data);
};

/**
 * リソースが見つからないエラーレスポンスを生成
 * InvalidRequest (-32600) を使用
 */
export const createNotFoundError = (
  message = "Resource not found",
  data?: unknown,
): McpErrorResponse => {
  return createMcpError(ErrorCode.InvalidRequest, message, data);
};
