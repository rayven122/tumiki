import type { Logger } from "./types.js";

/**
 * stderr出力のLogger（stdoutはMCPプロトコル/IPC用のため）
 * process.ts / cli.ts で共通利用
 */
export const stderrLogger: Logger = {
  info: (msg, meta) =>
    console.error(`[INFO] ${msg}${meta ? ` ${JSON.stringify(meta)}` : ""}`),
  error: (msg, meta) =>
    console.error(`[ERROR] ${msg}${meta ? ` ${JSON.stringify(meta)}` : ""}`),
  warn: (msg, meta) =>
    console.error(`[WARN] ${msg}${meta ? ` ${JSON.stringify(meta)}` : ""}`),
  debug: (msg, meta) =>
    console.error(`[DEBUG] ${msg}${meta ? ` ${JSON.stringify(meta)}` : ""}`),
};
