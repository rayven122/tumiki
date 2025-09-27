import type { GoogleApiError } from "../api/types/google-api.js";
import { GoogleSheetsApiError } from "../lib/errors/index.js";
import { err } from "../lib/result/index.js";

/**
 * API エラーを処理する共通ハンドラー
 * @param error - キャッチされたエラー
 * @param operation - 実行しようとした操作の説明
 * @returns GoogleSheetsApiError を含む Result.err
 */
export const handleApiError = (error: unknown, operation: string) => {
  const googleError = error as GoogleApiError;
  const status = googleError.response?.status;
  const data = googleError.response?.data;
  const message = error instanceof Error ? error.message : "Unknown error";

  return err(
    new GoogleSheetsApiError(
      `Failed to ${operation}: ${message}`,
      status,
      data,
    ),
  );
};
