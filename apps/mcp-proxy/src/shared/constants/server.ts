/**
 * サーバー定数
 */

/**
 * デフォルトのサーバーポート
 */
export const DEFAULT_PORT = 8080;

/**
 * サポートされているログレベル
 */
export const LOG_LEVELS = ["info", "warn", "error", "debug"] as const;

/**
 * デフォルトのログレベル
 */
export const DEFAULT_LOG_LEVEL = "info";

/**
 * デフォルトのMCPクライアントタイムアウト（ミリ秒）
 * 環境変数 MCP_TIMEOUT で上書き可能
 */
export const DEFAULT_MCP_TIMEOUT = 120000; // 2分
