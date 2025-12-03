/**
 * MCP Error Handler
 *
 * MCPエラーの処理とHTTPステータスコードへのマッピングを提供
 */

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCPエラー情報
 */
export type McpErrorInfo = {
  httpStatus: number;
  errorCode: number;
  errorMessage: string;
  errorData?: unknown;
};

/**
 * MCPエラーコードからHTTPステータスコードへのマッピング
 */
const errorCodeToHttpStatus = (code: ErrorCode): number => {
  switch (code) {
    case ErrorCode.MethodNotFound:
      return 404;
    case ErrorCode.InvalidParams:
    case ErrorCode.InvalidRequest:
    case ErrorCode.ParseError:
      return 400;
    case ErrorCode.RequestTimeout:
      return 408;
    case ErrorCode.ConnectionClosed:
      return 503;
    case ErrorCode.InternalError:
      return 500;
  }
};

/**
 * エラーからMCPエラー情報を抽出
 *
 * @param error - エラーオブジェクト
 * @returns MCPエラー情報
 */
export const extractMcpErrorInfo = (error: unknown): McpErrorInfo => {
  if (error instanceof McpError) {
    return {
      httpStatus: errorCodeToHttpStatus(error.code),
      errorCode: error.code,
      errorMessage: error.message,
      errorData: error.data,
    };
  }

  if (error instanceof Error) {
    return {
      httpStatus: 500,
      errorCode: ErrorCode.InternalError,
      errorMessage: error.message,
    };
  }

  return {
    httpStatus: 500,
    errorCode: ErrorCode.InternalError,
    errorMessage: "Unknown error",
  };
};

/**
 * エラーコードの名前を取得
 *
 * @param code - エラーコード
 * @returns エラーコード名
 */
export const getErrorCodeName = (code: number): string => {
  const errorCode = code as ErrorCode;

  switch (errorCode) {
    case ErrorCode.ConnectionClosed:
      return "ConnectionClosed";
    case ErrorCode.RequestTimeout:
      return "RequestTimeout";
    case ErrorCode.ParseError:
      return "ParseError";
    case ErrorCode.InvalidRequest:
      return "InvalidRequest";
    case ErrorCode.MethodNotFound:
      return "MethodNotFound";
    case ErrorCode.InvalidParams:
      return "InvalidParams";
    case ErrorCode.InternalError:
      return "InternalError";
    default:
      return `Unknown(${code})`;
  }
};
