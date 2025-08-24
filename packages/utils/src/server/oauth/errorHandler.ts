/**
 * OAuth Error Handler
 * エラーハンドリング、リトライロジック、サーキットブレーカーの実装
 */

import type { OAuthError } from "./types.js";
import { createOAuthError, OAuthErrorCodes } from "./utils.js";

/**
 * リトライ可能なエラーかどうかを判定
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // ネットワークエラー
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("etimedout")
    ) {
      return true;
    }
  }

  // OAuthエラーの場合
  if (isOAuthError(error)) {
    const oauthError = error;
    // 一時的なエラーの場合はリトライ可能
    return (
      oauthError.error === OAuthErrorCodes.TEMPORARILY_UNAVAILABLE ||
      oauthError.error === OAuthErrorCodes.SERVER_ERROR
    );
  }

  // HTTPステータスコードによる判定
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    // 5xx エラーまたは 429 (Too Many Requests) はリトライ可能
    return status >= 500 || status === 429;
  }

  return false;
};

/**
 * OAuthエラーかどうかを判定
 */
export const isOAuthError = (error: unknown): error is OAuthError => {
  return (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    typeof (error as OAuthError).error === "string"
  );
};

/**
 * エラーをOAuthエラーに変換
 */
export const toOAuthError = (error: unknown): OAuthError => {
  if (isOAuthError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return createOAuthError(OAuthErrorCodes.SERVER_ERROR, error.message);
  }

  return createOAuthError(OAuthErrorCodes.SERVER_ERROR, String(error));
};

/**
 * 指数バックオフによるリトライ遅延を計算
 */
export const calculateExponentialBackoff = (
  attempt: number,
  baseDelay = 1000,
  maxDelay = 32000,
): number => {
  // 2^attempt * baseDelay with jitter
  const delay = Math.min(Math.pow(2, attempt) * baseDelay, maxDelay);
  // Add random jitter (0-25% of delay)
  const jitter = Math.random() * 0.25 * delay;
  return Math.floor(delay + jitter);
};

/**
 * リトライロジックを実装
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    maxDelay = 32000,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 最後の試行またはリトライ不可能なエラーの場合は例外を投げる
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // リトライコールバック
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // 指数バックオフで待機
      const delay = calculateExponentialBackoff(attempt, retryDelay, maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // ここには到達しないはずだが、型安全のため
  throw lastError;
};

/**
 * サーキットブレーカーの状態
 */
export enum CircuitState {
  CLOSED = "CLOSED", // 正常状態
  OPEN = "OPEN", // 遮断状態
  HALF_OPEN = "HALF_OPEN", // 半開状態
}

/**
 * サーキットブレーカークラス
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly options: {
      failureThreshold?: number; // 失敗回数の閾値
      successThreshold?: number; // 成功回数の閾値（半開→閉）
      timeout?: number; // タイムアウト時間（ミリ秒）
      resetTimeout?: number; // リセットタイムアウト（ミリ秒）
    } = {},
  ) {
    this.options = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1分
      resetTimeout: 30000, // 30秒
      ...options,
    };
  }

  /**
   * 関数を実行
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 遮断状態をチェック
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime < (this.options.resetTimeout ?? 30000)) {
        throw new Error(
          "Circuit breaker is open - service temporarily unavailable",
        );
      }
      // タイムアウト経過後は半開状態に移行
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();

      // 成功時の処理
      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= (this.options.successThreshold ?? 2)) {
          // 半開状態から閉状態に移行
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      } else {
        // 正常状態では失敗カウントをリセット
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      // 失敗時の処理
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.state === CircuitState.HALF_OPEN) {
        // 半開状態で失敗したら即座に遮断状態に戻る
        this.state = CircuitState.OPEN;
      } else if (this.failureCount >= (this.options.failureThreshold ?? 5)) {
        // 閾値を超えたら遮断状態に移行
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }

  /**
   * 現在の状態を取得
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * グローバルサーキットブレーカーマップ
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * サーキットブレーカーを取得または作成
 */
export const getCircuitBreaker = (
  key: string,
  options?: ConstructorParameters<typeof CircuitBreaker>[0],
): CircuitBreaker => {
  let breaker = circuitBreakers.get(key);
  if (!breaker) {
    breaker = new CircuitBreaker(options);
    circuitBreakers.set(key, breaker);
  }
  return breaker;
};

/**
 * サーキットブレーカー付きリトライ
 */
export const withCircuitBreakerAndRetry = async <T>(
  key: string,
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    circuitBreakerOptions?: ConstructorParameters<typeof CircuitBreaker>[0];
  } = {},
): Promise<T> => {
  const breaker = getCircuitBreaker(key, options.circuitBreakerOptions);

  return breaker.execute(() =>
    withRetry(fn, {
      maxRetries: options.maxRetries,
      retryDelay: options.retryDelay,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} for ${key}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      },
    }),
  );
};
