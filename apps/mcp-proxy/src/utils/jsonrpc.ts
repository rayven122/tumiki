/**
 * JSON-RPC 2.0 ヘルパーユーティリティ
 *
 * JSON-RPC エラーと成功レスポンスの構築を一元化
 */

/**
 * JSON-RPC エラーレスポンスを作成
 *
 * @param id リクエストID
 * @param code エラーコード
 * @param message エラーメッセージ
 * @param data 追加データ（オプション）
 */
export const createJsonRpcError = (
  id: unknown,
  code: number,
  message: string,
  data?: unknown,
): {
  jsonrpc: "2.0";
  id: unknown;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
} => {
  const error: { code: number; message: string; data?: unknown } = {
    code,
    message,
  };

  if (data !== undefined) {
    error.data = data;
  }

  return {
    jsonrpc: "2.0" as const,
    id: id ?? null,
    error,
  };
};

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
