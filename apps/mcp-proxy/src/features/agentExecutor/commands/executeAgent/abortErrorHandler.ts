/**
 * AbortErrorハンドリングヘルパー
 */

/** タイムアウトエラーメッセージ */
export const TIMEOUT_ERROR_MESSAGE = "Execution timeout";

/**
 * AbortErrorかどうかを判定
 * AbortController.abort()によるエラーは "AbortError" name を持つ
 */
export const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  // AbortController.abort(new Error("message")) または DOMException AbortError
  return error.message === TIMEOUT_ERROR_MESSAGE || error.name === "AbortError";
};

/**
 * エラーメッセージを取得（AbortErrorの場合は統一メッセージを返す）
 */
export const getErrorMessage = (error: Error): string => {
  if (isAbortError(error)) {
    return TIMEOUT_ERROR_MESSAGE;
  }
  return error.message;
};
