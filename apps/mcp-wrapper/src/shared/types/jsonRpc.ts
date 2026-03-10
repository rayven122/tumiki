/**
 * JSON-RPC 2.0 型定義
 */

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
};

/** JSON-RPC標準エラーコード */
export const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  /** サーバーが見つからない（カスタム） */
  SERVER_NOT_FOUND: -32001,
  /** プロセスエラー（カスタム） */
  PROCESS_ERROR: -32000,
} as const;
