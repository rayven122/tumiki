/**
 * JSON-RPC 2.0 型ガード
 */

/**
 * JSON-RPC 2.0 リクエスト型
 */
export type JsonRpcRequest = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  id?: string | number | null;
};

/**
 * JSON-RPC 2.0 通知型（idなしのリクエスト）
 */
export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

/**
 * JSON-RPC 2.0 成功レスポンス型
 */
export type JsonRpcSuccessResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
};

/**
 * JSON-RPC 2.0 エラーレスポンス型
 */
export type JsonRpcErrorResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

/**
 * JSON-RPC 2.0 オブジェクトかどうかの基本チェック
 */
const isJsonRpcObject = (obj: unknown): obj is { jsonrpc: "2.0" } =>
  typeof obj === "object" &&
  obj !== null &&
  "jsonrpc" in obj &&
  obj.jsonrpc === "2.0";

/**
 * JSON-RPC 2.0 リクエストの型ガード
 */
export const isJsonRpcRequest = (obj: unknown): obj is JsonRpcRequest =>
  isJsonRpcObject(obj) && "method" in obj && typeof obj.method === "string";

/**
 * JSON-RPC 2.0 通知の型ガード（idなしのリクエスト）
 */
export const isJsonRpcNotification = (
  obj: unknown,
): obj is JsonRpcNotification => isJsonRpcRequest(obj) && !("id" in obj);

/**
 * JSON-RPC 2.0 成功レスポンスの型ガード
 */
export const isJsonRpcSuccessResponse = (
  obj: unknown,
): obj is JsonRpcSuccessResponse => isJsonRpcObject(obj) && "result" in obj;

/**
 * JSON-RPC 2.0 エラーレスポンスの型ガード
 */
export const isJsonRpcErrorResponse = (
  obj: unknown,
): obj is JsonRpcErrorResponse => isJsonRpcObject(obj) && "error" in obj;
