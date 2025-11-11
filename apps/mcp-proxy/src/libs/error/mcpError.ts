/**
 * MCP (JSON-RPC 2.0) エラー生成ユーティリティ
 */

import { ERROR_CODES } from "../../constants/config.js";

/**
 * JSON-RPC 2.0 エラーレスポンス型
 */
export type McpErrorResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

/**
 * 統一されたMCPエラーレスポンスを生成
 *
 * @param code - エラーコード（ERROR_CODESを使用）
 * @param message - エラーメッセージ
 * @param data - 追加データ（オプション）
 * @param requestId - リクエストID（オプション）
 * @returns JSON-RPC 2.0 エラーレスポンス
 *
 * @example
 * ```ts
 * return c.json(createMcpError(ERROR_CODES.UNAUTHORIZED, "Invalid token"), 401);
 * ```
 */
export const createMcpError = (
  code: number,
  message: string,
  data?: unknown,
  requestId: string | number | null = null,
): McpErrorResponse => {
  return {
    jsonrpc: "2.0",
    id: requestId,
    error: {
      code,
      message,
      ...(data !== undefined && { data }),
    },
  };
};

/**
 * 認証エラーレスポンスを生成
 */
export const createUnauthorizedError = (
  message = "Authentication required",
  data?: unknown,
): McpErrorResponse => {
  return createMcpError(ERROR_CODES.UNAUTHORIZED, message, data);
};

/**
 * 権限拒否エラーレスポンスを生成
 */
export const createPermissionDeniedError = (
  message = "Permission denied",
  data?: unknown,
): McpErrorResponse => {
  return createMcpError(ERROR_CODES.PERMISSION_DENIED, message, data);
};

/**
 * 無効なリクエストエラーレスポンスを生成
 */
export const createInvalidRequestError = (
  message = "Invalid request",
  data?: unknown,
): McpErrorResponse => {
  return createMcpError(ERROR_CODES.INVALID_REQUEST, message, data);
};
