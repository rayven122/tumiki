/**
 * JSON-RPC 2.0 成功レスポンス
 */

/**
 * JSON-RPC 成功レスポンスを作成
 *
 * @param id リクエストID
 * @param result 結果データ
 */
export const createJsonRpcSuccess = (
  id: unknown,
  result: unknown,
): {
  jsonrpc: "2.0";
  id: unknown;
  result: unknown;
} => ({
  jsonrpc: "2.0" as const,
  id: id ?? null,
  result,
});
