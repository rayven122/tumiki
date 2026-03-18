/**
 * React Query のリトライ戦略を定義
 */

import {
  shouldRetryError,
  calculateRetryDelay as calculateDelay,
} from "./errorHandling";

/**
 * クエリのリトライ判定ロジック
 * @param failureCount 失敗回数
 * @param error エラーオブジェクト
 * @returns リトライすべきかどうか
 */
export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  return shouldRetryError(error, failureCount, 3);
};

/**
 * リトライ遅延時間を計算（指数バックオフ）
 * @param attemptIndex リトライ回数（0から始まる）
 * @returns 遅延時間（ミリ秒）
 */
export const calculateRetryDelay = (attemptIndex: number): number => {
  return calculateDelay(attemptIndex);
};
