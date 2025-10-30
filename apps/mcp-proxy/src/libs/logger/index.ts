/**
 * シンプルな構造化ログユーティリティ
 * Cloud Logging自動連携
 */

type LogLevel = "info" | "warn" | "error" | "debug";
type LogMetadata = Record<string, unknown>;

/**
 * 構造化ログを出力
 */
export const log = (
  level: LogLevel,
  message: string,
  metadata?: LogMetadata,
): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  };

  // 本番環境: JSON形式（Cloud Logging用）
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(logData));
  } else {
    // 開発環境: 読みやすい形式
    console.log(`[${level.toUpperCase()}] ${message}`, metadata ?? "");
  }
};

/**
 * 情報ログ
 */
export const logInfo = (message: string, metadata?: LogMetadata): void => {
  log("info", message, metadata);
};

/**
 * 警告ログ
 */
export const logWarn = (message: string, metadata?: LogMetadata): void => {
  log("warn", message, metadata);
};

/**
 * エラーログ
 */
export const logError = (
  message: string,
  error: Error,
  metadata?: LogMetadata,
): void => {
  log("error", message, {
    errorMessage: error.message,
    stack: error.stack,
    ...metadata,
  });
};

/**
 * デバッグログ
 */
export const logDebug = (message: string, metadata?: LogMetadata): void => {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.LOG_LEVEL === "debug"
  ) {
    log("debug", message, metadata);
  }
};

// エクスポート
export { sanitizeIdForLog } from "./sanitize.js";
