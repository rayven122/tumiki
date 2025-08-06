import { randomUUID } from "crypto";
import { config } from "../libs/config.js";

// Transport種別
export enum TransportType {
  SSE = "sse",
  STREAMABLE_HTTP = "streamable_http",
}

// 認証情報の型定義
export interface AuthInfo {
  type: "api_key" | "oauth";
  userId?: string;
  userMcpServerInstanceId?: string;
  organizationId?: string;
}

// 共通セッション情報
export interface SessionInfo {
  id: string;
  transportType: TransportType;
  clientId: string;
  createdAt: number;
  lastActivity: number;
  errorCount: number;
  cleanup?: () => Promise<void>;
  authInfo: AuthInfo;
}

// セッション管理設定
export const SESSION_CONFIG = {
  /** セッションタイムアウト設定（ミリ秒） */
  SESSION_TIMEOUT: config.timeouts.connection,
  /** セッションクリーンアップ間隔（ミリ秒） */
  CLEANUP_INTERVAL: config.timeouts.keepalive,
  /** 最大セッション数 */
  MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS || "200", 10),
  /** 最大エラー数 */
  MAX_ERROR_COUNT: config.connection.maxErrorCount,
} as const;

// 全セッション管理（transport種別問わず）
export const sessions = new Map<string, SessionInfo>();

/**
 * 新しいセッションIDを生成
 */
export const generateSessionId = (): string => randomUUID();

/**
 * 指定されたセッションIDでセッションを作成
 */
export const createSessionWithId = (
  sessionId: string,
  transportType: TransportType,
  authInfo: AuthInfo,
  clientId = "unknown",
  cleanup?: () => Promise<void>,
): SessionInfo => {
  const now = Date.now();

  const session: SessionInfo = {
    id: sessionId,
    transportType,
    clientId,
    createdAt: now,
    lastActivity: now,
    errorCount: 0,
    cleanup,
    authInfo,
  };

  sessions.set(sessionId, session);

  // セッション作成の詳細ログを削除（メモリ使用量削減）

  return session;
};

/**
 * セッションを取得
 */
export const getSession = (sessionId: string): SessionInfo | undefined => {
  return sessions.get(sessionId);
};

/**
 * セッションアクティビティを更新
 */
export const updateSessionActivity = (
  sessionId: string,
  clientId?: string,
): void => {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
    if (clientId && clientId !== "unknown") {
      session.clientId = clientId;
    }
    sessions.set(sessionId, session);
  }
};

/**
 * セッションの有効性をチェック
 */
export const isSessionValid = (sessionId: string): boolean => {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const now = Date.now();
  const timeSinceActivity = now - session.lastActivity;

  return (
    timeSinceActivity <= SESSION_CONFIG.SESSION_TIMEOUT &&
    session.errorCount < SESSION_CONFIG.MAX_ERROR_COUNT
  );
};

/**
 * セッションを削除
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  const session = sessions.get(sessionId);
  if (!session) return;

  // クリーンアップ関数を実行
  await session.cleanup?.();

  sessions.delete(sessionId);
};

/**
 * 期限切れセッションのクリーンアップ
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  const now = Date.now();
  const expiredSessions: string[] = [];

  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
      expiredSessions.push(sessionId);
    }
  }

  await Promise.all(
    expiredSessions.map((sessionId) => deleteSession(sessionId)),
  );
};

/**
 * セッション制限チェック
 */
export const canCreateNewSession = (): boolean => {
  return sessions.size < SESSION_CONFIG.MAX_SESSIONS;
};

/**
 * Transport種別別のセッション統計を取得
 */
export const getSessionStats = () => {
  const sseCount = Array.from(sessions.values()).filter(
    (s) => s.transportType === TransportType.SSE,
  ).length;
  const streamableCount = Array.from(sessions.values()).filter(
    (s) => s.transportType === TransportType.STREAMABLE_HTTP,
  ).length;
  const activeCount = Array.from(sessions.values()).filter(
    (session) =>
      Date.now() - session.lastActivity <= SESSION_CONFIG.SESSION_TIMEOUT,
  ).length;

  return {
    totalSessions: sessions.size,
    activeSessions: activeCount,
    sse: sseCount,
    streamableHttp: streamableCount,
  };
};

/**
 * 全セッションをクリーンアップ
 */
export const cleanupAllSessions = async (): Promise<void> => {
  const cleanupPromises: Promise<void>[] = [];

  for (const sessionId of sessions.keys()) {
    cleanupPromises.push(deleteSession(sessionId));
  }

  await Promise.all(cleanupPromises);
};
