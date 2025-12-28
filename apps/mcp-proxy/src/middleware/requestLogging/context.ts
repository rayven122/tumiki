import { AsyncLocalStorage } from "node:async_hooks";
import type { TransportType } from "@tumiki/db/server";

/**
 * MCP実行コンテキスト
 *
 * リクエスト受信からレスポンス返却までの全ライフサイクルを管理。
 * middlewareとtoolExecutorで共有する情報を格納。
 *
 * - ログ記録（BigQuery送信）
 * - PIIマスキング済みボディの受け渡し
 * - エラー情報の伝播
 */
export type McpExecutionContext = {
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

  // リクエスト・レスポンスボディ（piiMaskingEnabled が true の時、PIIマスキング済み）
  requestBody?: string;
  responseBody?: string;
};

const executionStorage = new AsyncLocalStorage<McpExecutionContext>();

/**
 * 現在の実行コンテキストを取得
 *
 * @returns 現在のコンテキスト、未設定の場合はundefined
 */
export const getExecutionContext = (): McpExecutionContext | undefined => {
  return executionStorage.getStore();
};

/**
 * 現在の実行コンテキストを部分的に更新
 *
 * @param updates - 更新する値
 */
export const updateExecutionContext = (
  updates: Partial<McpExecutionContext>,
): void => {
  const current = executionStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
};

/**
 * 新しい実行コンテキストでコールバックを実行
 *
 * @param context - 初期コンテキスト
 * @param callback - 実行するコールバック関数
 * @returns コールバックの実行結果
 */
export const runWithExecutionContext = async <T>(
  context: McpExecutionContext,
  callback: () => Promise<T>,
): Promise<T> => {
  return executionStorage.run(context, callback);
};
