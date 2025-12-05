/**
 * HTTP ステータスコード付きエラー型
 */
export type ErrorWithStatus = {
  message: string;
  status?: number;
  name: string;
  cause?: unknown;
};

/**
 * エラー分類
 */
export type ErrorCategory =
  | "network" // ネットワークエラー
  | "auth" // 認証エラー (401, 403)
  | "server" // サーバーエラー (5xx)
  | "client" // クライアントエラー (4xx)
  | "timeout" // タイムアウトエラー
  | "unknown"; // 不明なエラー

/**
 * エラーメッセージ定数
 * 将来的に国際化対応する際は、このオブジェクトを関数化するか、
 * i18nライブラリを使用して翻訳を提供する
 */
const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  network: "ネットワーク接続に失敗しました",
  timeout: "リクエストがタイムアウトしました",
  auth: "認証に失敗しました",
  server: "サーバーエラーが発生しました",
  client: "リクエストが無効です",
  unknown: "予期しないエラーが発生しました",
};

/**
 * エラー情報
 */
export type ErrorInfo = {
  category: ErrorCategory;
  message: string;
  status?: number;
  shouldRetry: boolean;
};

/**
 * エラーをHTTPステータス付きエラーに変換
 */
export const toErrorWithStatus = (error: unknown): ErrorWithStatus => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    "name" in error
  ) {
    return {
      message: String(error.message),
      status: "status" in error ? Number(error.status) : undefined,
      name: String(error.name),
      cause: "cause" in error ? error.cause : undefined,
    };
  }

  return {
    message: String(error),
    name: "Error",
  };
};

/**
 * エラーを分類
 */
export const classifyError = (error: unknown): ErrorInfo => {
  const errorWithStatus = toErrorWithStatus(error);
  const { message, status } = errorWithStatus;

  // ネットワークエラー（fetch関連）
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("Failed to fetch")
  ) {
    return {
      category: "network",
      message: ERROR_MESSAGES.network,
      shouldRetry: true,
    };
  }

  // タイムアウトエラー
  if (message.includes("timeout") || message.includes("aborted")) {
    return {
      category: "timeout",
      message: ERROR_MESSAGES.timeout,
      shouldRetry: true,
    };
  }

  // HTTPステータスコードによる分類
  if (status !== undefined) {
    // 認証エラー
    if (status === 401 || status === 403) {
      return {
        category: "auth",
        message: ERROR_MESSAGES.auth,
        status,
        shouldRetry: false,
      };
    }

    // サーバーエラー
    if (status >= 500) {
      return {
        category: "server",
        message: ERROR_MESSAGES.server,
        status,
        shouldRetry: true,
      };
    }

    // クライアントエラー
    if (status >= 400) {
      return {
        category: "client",
        message: ERROR_MESSAGES.client,
        status,
        shouldRetry: false,
      };
    }
  }

  // 不明なエラー
  return {
    category: "unknown",
    message: message || ERROR_MESSAGES.unknown,
    status,
    shouldRetry: false,
  };
};

/**
 * エラーのリトライ判定
 */
export const shouldRetryError = (
  error: unknown,
  failureCount: number,
  maxRetries = 3,
): boolean => {
  const errorInfo = classifyError(error);

  // リトライ不可なエラー
  if (!errorInfo.shouldRetry) {
    return false;
  }

  // リトライ回数超過
  if (failureCount >= maxRetries) {
    return false;
  }

  return true;
};

/**
 * リトライ遅延時間を計算（指数バックオフ）
 */
export const calculateRetryDelay = (attemptIndex: number): number => {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
};

/**
 * センシティブ情報をフィルタリング
 */
const sanitizeError = (error: unknown): unknown => {
  if (!error || typeof error !== "object") {
    return error;
  }

  // センシティブなキーのリスト
  const sensitiveKeys = [
    "token",
    "accessToken",
    "refreshToken",
    "password",
    "secret",
    "apiKey",
    "authorization",
    "cookie",
    "session",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(error)) {
    // センシティブなキーは [REDACTED] に置き換え
    if (
      sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      // ネストされたオブジェクトも再帰的にサニタイズ
      sanitized[key] = sanitizeError(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * エラーをログに記録
 */
export const logError = (error: unknown, context?: string): ErrorWithStatus => {
  const errorWithStatus = toErrorWithStatus(error);
  const errorInfo = classifyError(error);

  if (process.env.NODE_ENV === "development") {
    console.error(`[${errorInfo.category}] ${context || "Error"}:`, {
      message: errorInfo.message,
      status: errorInfo.status,
      originalError: sanitizeError(error),
    });
  } else {
    // 本番環境では最小限のログのみ
    console.error(`Error: ${errorInfo.message}`);
  }

  return errorWithStatus;
};
