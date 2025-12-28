import { AsyncLocalStorage } from "node:async_hooks";
import type { TransportType } from "@tumiki/db/server";

/**
 * MCPリクエストログのコンテキスト情報
 * middlewareとtoolExecutorで共有するログ情報
 *
 * McpServerRequestLogから必要なフィールドを抽出し、
 * 実行時に必要な追加情報を含める
 */
export type McpRequestLoggingContext = {
  // 初回実行時に設定する情報
  requestStartTime: number;
  inputBytes: number;

  // 実行時に計算される追加情報
  toolName?: string;
  transportType?: TransportType;
  method?: string;
  httpStatus?: number;
  errorCode?: number;
  errorMessage?: string;
  errorDetails?: unknown; // エラーオブジェクト全体

  // リクエスト・レスポンスJSON（BigQueryログ用）
  requestBody?: unknown;
  responseBody?: unknown;
};

const requestLoggingStorage = new AsyncLocalStorage<McpRequestLoggingContext>();

/**
 * 現在のリクエストログコンテキストを取得
 *
 * @returns 現在のコンテキスト、未設定の場合はundefined
 */
export const getRequestLoggingContext = ():
  | McpRequestLoggingContext
  | undefined => {
  return requestLoggingStorage.getStore();
};

/**
 * 現在のリクエストログコンテキストを部分的に更新
 *
 * @param updates - 更新する値
 */
export const updateRequestLoggingContext = (
  updates: Partial<McpRequestLoggingContext>,
): void => {
  const current = requestLoggingStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
};

/**
 * 新しいリクエストログコンテキストでコールバックを実行
 *
 * @param context - 初期コンテキスト
 * @param callback - 実行するコールバック関数
 * @returns コールバックの実行結果
 */
export const runWithRequestLoggingContext = async <T>(
  context: McpRequestLoggingContext,
  callback: () => Promise<T>,
): Promise<T> => {
  return requestLoggingStorage.run(context, callback);
};
