import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { Logger } from "../types.js";

// PII 検出履歴を観測可能にするためのファイルロガー
// CLI モード（Claude Code 等から spawn される）の stderr は呼び出し元に取り込まれてしまい、
// 検出ログが見えづらいため、独立したファイルにも書き出す
export const createFileLogger = (logPath: string): Logger => {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
  } catch {
    // ディレクトリ作成に失敗してもプロセスは止めない（後続の append で失敗するだけ）
  }

  const write = (level: string, msg: string, meta?: unknown): void => {
    const timestamp = new Date().toISOString();
    const metaPart = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
    const line = `[${timestamp}] [${level}] ${msg}${metaPart}\n`;
    try {
      appendFileSync(logPath, line);
    } catch {
      // ファイル書き込み失敗時は何もしない（PII マスキング本体は止めない）
    }
  };

  return {
    info: (msg, meta) => write("INFO", msg, meta),
    error: (msg, meta) => write("ERROR", msg, meta),
    warn: (msg, meta) => write("WARN", msg, meta),
    debug: (msg, meta) => write("DEBUG", msg, meta),
  };
};

// 複数の Logger を束ねる（例: stderr と file の両方に書く用途）
export const combineLoggers = (...loggers: readonly Logger[]): Logger => ({
  info: (msg, meta) => {
    for (const l of loggers) l.info(msg, meta);
  },
  error: (msg, meta) => {
    for (const l of loggers) l.error(msg, meta);
  },
  warn: (msg, meta) => {
    for (const l of loggers) l.warn(msg, meta);
  },
  debug: (msg, meta) => {
    for (const l of loggers) l.debug(msg, meta);
  },
});
