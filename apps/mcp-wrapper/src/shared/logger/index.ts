/**
 * 構造化ログユーティリティ
 */

type LogMeta = Record<string, unknown>;

const formatLog = (
  level: string,
  message: string,
  meta?: LogMeta,
  error?: Error,
) => {
  return JSON.stringify({
    level,
    message,
    ...(error && { error: error.message, stack: error.stack }),
    ...meta,
    time: new Date().toISOString(),
  });
};

export const logInfo = (message: string, meta?: LogMeta) => {
  console.log(formatLog("info", message, meta));
};

export const logWarn = (message: string, meta?: LogMeta) => {
  console.warn(formatLog("warn", message, meta));
};

export const logError = (message: string, error: Error, meta?: LogMeta) => {
  console.error(formatLog("error", message, meta, error));
};

export const logDebug = (message: string, meta?: LogMeta) => {
  if (process.env.DEBUG === "true") {
    console.debug(formatLog("debug", message, meta));
  }
};
