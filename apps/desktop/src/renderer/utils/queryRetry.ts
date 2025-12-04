/**
 * React Query のリトライ戦略を定義
 */

type ErrorWithStatus = Error & { status?: number };

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
  // ネットワークエラーの場合は3回までリトライ
  if (error instanceof Error && error.message.includes("fetch")) {
    return failureCount < 3;
  }

  // 認証エラー（401, 403）はリトライしない
  if (isAuthError(error)) {
    return false;
  }

  // その他のエラーは1回のみリトライ
  return failureCount < 1;
};

/**
 * 認証エラーかどうかを判定
 * @param error エラーオブジェクト
 * @returns 認証エラーかどうか
 */
const isAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const errorWithStatus = error as ErrorWithStatus;
  return errorWithStatus.status === 401 || errorWithStatus.status === 403;
};

/**
 * リトライ遅延時間を計算（指数バックオフ）
 * @param attemptIndex リトライ回数（0から始まる）
 * @returns 遅延時間（ミリ秒）
 */
export const calculateRetryDelay = (attemptIndex: number): number => {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
};
