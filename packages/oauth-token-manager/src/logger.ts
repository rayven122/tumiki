/**
 * Simple Logger for OAuth Token Manager
 *
 * This is a minimal logger implementation.
 * In production, you should configure this to use your application's logger.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const formatMessage = (level: LogLevel, message: string, meta?: object) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

export const logger = {
  debug: (message: string, meta?: object) => {
    if (process.env.LOG_LEVEL === "debug") {
      console.debug(formatMessage("debug", message, meta));
    }
  },
  info: (message: string, meta?: object) => {
    console.info(formatMessage("info", message, meta));
  },
  warn: (message: string, meta?: object) => {
    console.warn(formatMessage("warn", message, meta));
  },
  error: (message: string, meta?: object) => {
    console.error(formatMessage("error", message, meta));
  },
};
