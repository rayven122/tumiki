/**
 * 統一的なログシステム
 * 開発環境ではコンソールに出力、本番環境ではログファイルに保存（将来的な拡張）
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, unknown>;

/**
 * ログを出力
 * @param level ログレベル
 * @param message メッセージ
 * @param context 追加のコンテキスト情報
 */
const log = (level: LogLevel, message: string, context?: LogContext): void => {
  const isDevelopment = process.env.NODE_ENV === "development";

  // 開発環境ではコンソールに出力
  if (isDevelopment) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;

    switch (level) {
      case "error":
        console.error(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "debug":
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  } else {
    // 本番環境ではエラーのみコンソールに出力（将来的にはログファイルへの保存を検討）
    if (level === "error") {
      console.error(`[ERROR] ${message}`, context || "");
    }
  }
};

/**
 * 情報ログ
 */
export const info = (message: string, context?: LogContext): void => {
  log("info", message, context);
};

/**
 * 警告ログ
 */
export const warn = (message: string, context?: LogContext): void => {
  log("warn", message, context);
};

/**
 * エラーログ
 */
export const error = (
  message: string,
  errorOrContext?: Error | LogContext,
): void => {
  if (errorOrContext instanceof Error) {
    log("error", message, {
      error: errorOrContext.message,
      stack: errorOrContext.stack,
    });
  } else {
    log("error", message, errorOrContext);
  }
};

/**
 * デバッグログ（開発環境のみ）
 */
export const debug = (message: string, context?: LogContext): void => {
  log("debug", message, context);
};
