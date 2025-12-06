/**
 * 統一的なログシステム
 * 構造化ログ、ログファイルへの保存、ローテーション機能をサポート
 */

import { app } from "electron";
import { join } from "path";
import {
  existsSync,
  mkdirSync,
  appendFileSync,
  statSync,
  renameSync,
  unlinkSync,
} from "fs";

export type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, unknown>;

/**
 * 構造化ログエントリ
 */
type StructuredLogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  pid: number;
};

// ログファイルの最大サイズ（10MB）
const MAX_LOG_SIZE = 10 * 1024 * 1024;
// 保持するログファイルの数
const MAX_LOG_FILES = 5;

/**
 * ログディレクトリパスを取得
 */
const getLogDirectory = (): string => {
  if (app && app.getPath) {
    return app.getPath("logs");
  }
  // テスト環境用のフォールバック
  return join(process.cwd(), "logs");
};

/**
 * ログファイルパスを取得
 */
const getLogFilePath = (): string => {
  const logDir = getLogDirectory();

  // ログディレクトリが存在しない場合は作成（所有者のみアクセス可能）
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true, mode: 0o700 });
  }

  return join(logDir, "app.log");
};

/**
 * ログファイルのローテーション
 */
const rotateLogFile = (): void => {
  const logFilePath = getLogFilePath();

  // ログファイルが存在しない場合は何もしない
  if (!existsSync(logFilePath)) {
    return;
  }

  // ファイルサイズをチェック
  const stats = statSync(logFilePath);
  if (stats.size < MAX_LOG_SIZE) {
    return;
  }

  // 古いログファイルをローテーション
  const logDir = getLogDirectory();

  // 最も古いログファイルを削除
  const oldestLog = join(logDir, `app.log.${MAX_LOG_FILES}`);
  if (existsSync(oldestLog)) {
    try {
      unlinkSync(oldestLog);
    } catch (error) {
      console.error(`Failed to delete oldest log file: ${oldestLog}`, error);
      // 削除に失敗しても続行
    }
  }

  // ログファイルをシフト
  for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
    const oldPath = join(logDir, `app.log.${i}`);
    const newPath = join(logDir, `app.log.${i + 1}`);
    if (existsSync(oldPath)) {
      try {
        renameSync(oldPath, newPath);
      } catch (error) {
        console.error(
          `Failed to rename log file: ${oldPath} -> ${newPath}`,
          error,
        );
        // リネームに失敗しても続行
      }
    }
  }

  // 現在のログファイルを .1 にリネーム
  const rotatedPath = join(logDir, "app.log.1");
  try {
    renameSync(logFilePath, rotatedPath);
  } catch (error) {
    console.error(`Failed to rotate current log file: ${logFilePath}`, error);
    // リネームに失敗しても続行
  }
};

/**
 * ログをファイルに書き込む
 */
const writeToLogFile = (entry: StructuredLogEntry): void => {
  try {
    // ローテーションチェック
    rotateLogFile();

    const logFilePath = getLogFilePath();
    const logLine = JSON.stringify(entry) + "\n";

    // ログファイルに書き込み（所有者のみ読み書き可能）
    appendFileSync(logFilePath, logLine, { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    // ログファイルへの書き込みに失敗してもアプリを停止しない
    console.error("Failed to write to log file:", error);
  }
};

/**
 * ログを出力
 * @param level ログレベル
 * @param message メッセージ
 * @param context 追加のコンテキスト情報
 */
const log = (level: LogLevel, message: string, context?: LogContext): void => {
  const isDevelopment = process.env.NODE_ENV === "development";

  // 構造化ログエントリを作成
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    pid: process.pid,
  };

  // 開発環境ではコンソールに人間が読みやすい形式で出力
  if (isDevelopment) {
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    const logMessage = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;

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
    // 本番環境ではエラーと警告のみコンソールに出力
    if (level === "error" || level === "warn") {
      const logMessage = `[${level.toUpperCase()}] ${message}`;
      console.error(logMessage, context || "");
    }
  }

  // 本番環境ではすべてのログをファイルに書き込む
  if (!isDevelopment) {
    writeToLogFile(entry);
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
