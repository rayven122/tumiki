/**
 * リトライユーティリティ
 */

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

export class NonRetryableError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "NonRetryableError";
  }
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * 指定された関数をリトライロジックで実行
 */
export const retryAsync = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> => {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // NonRetryableErrorの場合は即座に失敗
      if (lastError instanceof NonRetryableError) {
        throw lastError;
      }

      // 最後の試行の場合はエラーを投げる
      if (attempt === opts.maxAttempts) {
        break;
      }

      // 遅延時間を計算
      const delay = calculateDelay(attempt, opts);
      console.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`,
      );

      await sleep(delay);
    }
  }

  throw lastError!;
};

/**
 * バックオフ戦略による遅延時間を計算
 */
const calculateDelay = (attempt: number, options: RetryOptions): number => {
  const exponentialDelay =
    options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  let delay = Math.min(exponentialDelay, options.maxDelay);

  // ジッターを追加（同時実行時の競合状態を避ける）
  if (options.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.floor(delay);
};

/**
 * 指定されたミリ秒だけ待機
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * エラーの種類を判定してRetryableError/NonRetryableErrorに変換
 */
export const classifyError = (error: unknown): Error => {
  if (error instanceof RetryableError || error instanceof NonRetryableError) {
    return error;
  }

  const err = error instanceof Error ? error : new Error(String(error));

  // ネットワーク関連エラーはリトライ可能
  if (
    err.message.includes("ECONNRESET") ||
    err.message.includes("ECONNREFUSED") ||
    err.message.includes("ETIMEDOUT") ||
    err.message.includes("fetch failed")
  ) {
    return new RetryableError(`Network error: ${err.message}`, err);
  }

  // 認証エラーはリトライ不可
  if (
    err.message.includes("Unauthorized") ||
    err.message.includes("401") ||
    err.message.includes("403")
  ) {
    return new NonRetryableError(`Authentication error: ${err.message}`, err);
  }

  // 4xx系エラー（認証以外）はリトライ不可
  if (err.message.includes("400") || err.message.includes("404")) {
    return new NonRetryableError(`Client error: ${err.message}`, err);
  }

  // 5xx系エラーはリトライ可能
  if (
    err.message.includes("500") ||
    err.message.includes("502") ||
    err.message.includes("503")
  ) {
    return new RetryableError(`Server error: ${err.message}`, err);
  }

  // デフォルトではリトライ可能として扱う
  return new RetryableError(`Unknown error: ${err.message}`, err);
};
