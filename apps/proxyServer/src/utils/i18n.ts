/**
 * 簡易国際化ヘルパー
 * 将来的により包括的な i18n ソリューションに移行可能
 */

type ErrorMessages = {
  maxConnectionsPerSession: (max: number, sessionId: string) => string;
  connectionNotFound: (key: string) => string;
  invalidConfiguration: (message: string) => string;
  connectionTimeout: (timeout: number) => string;
  sessionNotFound: (sessionId: string) => string;
  serverConnectionFailed: (serverName: string, reason: string) => string;
  indexRebuildFailed: (reason: string) => string;
};

const messages: Record<"en" | "ja", ErrorMessages> = {
  en: {
    maxConnectionsPerSession: (max, sessionId) =>
      `Maximum connections per session (${max}) reached for session ${sessionId}`,
    connectionNotFound: (key) => `Connection not found: ${key}`,
    invalidConfiguration: (message) => `Invalid configuration: ${message}`,
    connectionTimeout: (timeout) => `Connection timed out after ${timeout}ms`,
    sessionNotFound: (sessionId) => `Session not found: ${sessionId}`,
    serverConnectionFailed: (serverName, reason) =>
      `Failed to connect to server ${serverName}: ${reason}`,
    indexRebuildFailed: (reason) =>
      `Failed to rebuild connection index: ${reason}`,
  },
  ja: {
    maxConnectionsPerSession: (max, sessionId) =>
      `セッション${sessionId}の最大接続数（${max}）に達しました`,
    connectionNotFound: (key) => `接続が見つかりません: ${key}`,
    invalidConfiguration: (message) => `無効な設定: ${message}`,
    connectionTimeout: (timeout) =>
      `${timeout}ミリ秒後に接続がタイムアウトしました`,
    sessionNotFound: (sessionId) => `セッションが見つかりません: ${sessionId}`,
    serverConnectionFailed: (serverName, reason) =>
      `サーバー${serverName}への接続に失敗しました: ${reason}`,
    indexRebuildFailed: (reason) =>
      `接続インデックスの再構築に失敗しました: ${reason}`,
  },
};

/**
 * 現在のロケールを取得（環境変数またはデフォルト）
 */
const getLocale = (): "en" | "ja" => {
  const locale = process.env.LOCALE ?? process.env.LANG ?? "en";
  return locale.startsWith("ja") ? "ja" : "en";
};

/**
 * 国際化されたエラーメッセージを取得
 */
export const i18n = new Proxy({} as ErrorMessages, {
  get(_, prop: keyof ErrorMessages) {
    const locale = getLocale();
    return messages[locale][prop];
  },
});

/**
 * エラーコードからメッセージを生成するヘルパー
 */
export const createErrorWithCode = (code: string, message: string): Error => {
  const error = new Error(message);
  (error as Error & { code?: string }).code = code;
  return error;
};
