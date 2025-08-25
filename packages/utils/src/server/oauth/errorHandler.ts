/**
 * OAuth Error Handler
 * エラー処理とリトライロジック
 */

import type { IPolicy } from "cockatiel";
import {
  circuitBreaker,
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleAll,
  retry,
  wrap,
} from "cockatiel";

import type { OAuthError } from "./types.js";
import { createOAuthError, OAuthErrorCodes } from "./minimalUtils.js";

/**
 * エラーの種類を判定
 */
export const classifyError = (
  error: unknown,
): {
  type: "retryable" | "non-retryable" | "fatal";
  code: string;
  message: string;
} => {
  if (isOAuthError(error)) {
    // OAuth標準エラー
    switch (error.error) {
      case OAuthErrorCodes.TEMPORARILY_UNAVAILABLE:
      case OAuthErrorCodes.SERVER_ERROR:
        return {
          type: "retryable",
          code: error.error,
          message: error.error_description ?? error.error,
        };

      case OAuthErrorCodes.INVALID_CLIENT:
      case OAuthErrorCodes.INVALID_GRANT:
      case OAuthErrorCodes.UNAUTHORIZED_CLIENT:
      case OAuthErrorCodes.ACCESS_DENIED:
        return {
          type: "non-retryable",
          code: error.error,
          message: error.error_description ?? error.error,
        };

      default:
        return {
          type: "non-retryable",
          code: error.error,
          message: error.error_description ?? error.error,
        };
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // ネットワークエラー
    if (
      message.includes("econnrefused") ||
      message.includes("etimedout") ||
      message.includes("enotfound") ||
      message.includes("network") ||
      message.includes("fetch failed")
    ) {
      return {
        type: "retryable",
        code: "network_error",
        message: error.message,
      };
    }

    // タイムアウトエラー
    if (message.includes("timeout") || message.includes("aborted")) {
      return {
        type: "retryable",
        code: "timeout",
        message: error.message,
      };
    }

    // HTTPステータスコード
    const statusMatch = /http (\d{3})/i.exec(message);
    if (statusMatch?.[1]) {
      const status = parseInt(statusMatch[1], 10);
      if (status >= 500 && status < 600) {
        return {
          type: "retryable",
          code: `http_${status}`,
          message: error.message,
        };
      }
      if (status === 401 || status === 403) {
        return {
          type: "non-retryable",
          code: `http_${status}`,
          message: error.message,
        };
      }
    }
  }

  // その他のエラー
  return {
    type: "fatal",
    code: "unknown_error",
    message: String(error),
  };
};

/**
 * OAuthエラーかどうかを判定
 */
export const isOAuthError = (error: unknown): error is OAuthError => {
  return (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    typeof (error as { error: unknown }).error === "string"
  );
};

/**
 * エラーをOAuthErrorに変換
 */
export const toOAuthError = (error: unknown): OAuthError => {
  if (isOAuthError(error)) {
    return error;
  }

  const classification = classifyError(error);

  return createOAuthError(classification.code, classification.message);
};

/**
 * リトライポリシーを作成
 */
export const createRetryPolicy = (
  maxAttempts = 3,
  initialDelay = 1000,
  maxDelay = 10000,
): IPolicy => {
  return retry(handleAll, {
    maxAttempts,
    backoff: new ExponentialBackoff({
      initialDelay,
      maxDelay,
      exponent: 2,
    }),
  });
};

/**
 * Circuit Breakerポリシーを作成
 */
export const createCircuitBreakerPolicy = (
  threshold = 5,
  halfOpenAfter = 30000,
): IPolicy => {
  return circuitBreaker(handleAll, {
    halfOpenAfter,
    breaker: new ConsecutiveBreaker(threshold),
  });
};

/**
 * 複合ポリシーを作成（Circuit Breaker + Retry）
 */
export const createCombinedPolicy = (
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    breakerThreshold?: number;
    halfOpenAfter?: number;
  } = {},
): IPolicy => {
  const retryPolicy = createRetryPolicy(
    options.maxRetries,
    options.initialDelay,
    options.maxDelay,
  );

  const breakerPolicy = createCircuitBreakerPolicy(
    options.breakerThreshold,
    options.halfOpenAfter,
  );

  return wrap(breakerPolicy, retryPolicy);
};

/**
 * エラーハンドリング付きで関数を実行
 */
export const executeWithErrorHandling = async <T>(
  fn: () => Promise<T>,
  options: {
    onRetry?: (attempt: number, error: unknown) => void;
    onBreak?: (error: unknown) => void;
    policy?: IPolicy;
  } = {},
): Promise<T> => {
  const policy = options.policy ?? createCombinedPolicy();

  let attempt = 0;

  const wrappedFn = async () => {
    try {
      attempt++;
      return await fn();
    } catch (error) {
      const classification = classifyError(error);

      // リトライ不可能なエラーは即座に失敗
      if (classification.type === "non-retryable") {
        throw error;
      }

      // リトライ時のコールバック
      if (options.onRetry && classification.type === "retryable") {
        options.onRetry(attempt, error);
      }

      throw error;
    }
  };

  try {
    return await policy.execute(wrappedFn);
  } catch (error) {
    // Circuit Breakerが開いた時のコールバック
    if (
      options.onBreak &&
      error instanceof Error &&
      error.message.includes("breaker is open")
    ) {
      options.onBreak(error);
    }
    throw error;
  }
};

/**
 * ユーザー向けエラーメッセージを生成
 */
export const getUserFriendlyErrorMessage = (error: unknown): string => {
  const classification = classifyError(error);

  switch (classification.code) {
    case OAuthErrorCodes.INVALID_CLIENT:
      return "認証設定に問題があります。管理者にお問い合わせください。";

    case OAuthErrorCodes.INVALID_GRANT:
      return "認証が期限切れです。再度ログインしてください。";

    case OAuthErrorCodes.ACCESS_DENIED:
      return "アクセスが拒否されました。必要な権限があることを確認してください。";

    case OAuthErrorCodes.TEMPORARILY_UNAVAILABLE:
    case OAuthErrorCodes.SERVER_ERROR:
      return "サーバーが一時的に利用できません。しばらくしてから再試行してください。";

    case "network_error":
      return "ネットワークエラーが発生しました。接続を確認してください。";

    case "timeout":
      return "リクエストがタイムアウトしました。再試行してください。";

    case "http_401":
      return "認証が必要です。ログインしてください。";

    case "http_403":
      return "アクセスが禁止されています。権限を確認してください。";

    case "http_404":
      return "リソースが見つかりません。";

    case "http_429":
      return "リクエストが多すぎます。しばらくしてから再試行してください。";

    default:
      if (classification.code.startsWith("http_5")) {
        return "サーバーエラーが発生しました。しばらくしてから再試行してください。";
      }
      return "予期しないエラーが発生しました。";
  }
};

/**
 * エラーログを構造化
 */
export const structureErrorLog = (
  error: unknown,
  context: Record<string, unknown> = {},
): Record<string, unknown> => {
  const classification = classifyError(error);
  const timestamp = new Date().toISOString();

  const log: Record<string, unknown> = {
    timestamp,
    error: {
      type: classification.type,
      code: classification.code,
      message: classification.message,
    },
    context,
  };

  if (error instanceof Error) {
    log.stack = error.stack;
  }

  if (isOAuthError(error)) {
    log.oauth = {
      error: error.error,
      description: error.error_description,
      uri: error.error_uri,
    };
  }

  return log;
};

/**
 * エラーレスポンスを生成
 */
export const createErrorResponse = (
  error: unknown,
  statusCode?: number,
): {
  statusCode: number;
  body: {
    error: string;
    error_description: string;
    error_uri?: string;
  };
} => {
  const oauthError = toOAuthError(error);
  const classification = classifyError(error);

  let status = statusCode ?? 500;

  switch (classification.code) {
    case OAuthErrorCodes.INVALID_CLIENT:
    case OAuthErrorCodes.INVALID_GRANT:
    case OAuthErrorCodes.UNAUTHORIZED_CLIENT:
      status = 401;
      break;

    case OAuthErrorCodes.ACCESS_DENIED:
      status = 403;
      break;

    case OAuthErrorCodes.INVALID_REQUEST:
    case OAuthErrorCodes.INVALID_SCOPE:
    case OAuthErrorCodes.UNSUPPORTED_RESPONSE_TYPE:
    case OAuthErrorCodes.UNSUPPORTED_GRANT_TYPE:
      status = 400;
      break;

    case OAuthErrorCodes.TEMPORARILY_UNAVAILABLE:
      status = 503;
      break;

    case OAuthErrorCodes.SERVER_ERROR:
    default:
      status = 500;
      break;
  }

  return {
    statusCode: status,
    body: {
      error: oauthError.error,
      error_description: getUserFriendlyErrorMessage(error),
      error_uri: oauthError.error_uri,
    },
  };
};
