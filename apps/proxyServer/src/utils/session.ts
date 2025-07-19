import { randomUUID } from "crypto";
import { logger } from "../libs/logger.js";
import { config } from "../libs/config.js";

// Transport種別
export enum TransportType {
  SSE = "sse",
  STREAMABLE_HTTP = "streamable_http",
}

// 共通セッション情報
export interface SessionInfo {
  id: string;
  transportType: TransportType;
  apiKeyId: string;
  clientId: string;
  createdAt: number;
  lastActivity: number;
  errorCount: number;
  cleanup?: () => Promise<void>;
}

// セッション管理設定
export const SESSION_CONFIG = {
  /** セッションタイムアウト設定（ミリ秒） */
  SESSION_TIMEOUT: config.timeouts.connection,
  /** セッションクリーンアップ間隔（ミリ秒） */
  CLEANUP_INTERVAL: config.timeouts.keepalive,
  /** 最大セッション数 */
  MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS || "1000", 10),
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
 * セッションを作成
 */
export const createSession = (
  transportType: TransportType,
  apiKeyId: string,
  clientId = "unknown",
  cleanup?: () => Promise<void>,
): SessionInfo => {
  const sessionId = generateSessionId();
  return createSessionWithId(
    sessionId,
    transportType,
    apiKeyId,
    clientId,
    cleanup,
  );
};

/**
 * 指定されたセッションIDでセッションを作成
 */
export const createSessionWithId = (
  sessionId: string,
  transportType: TransportType,
  apiKeyId: string,
  clientId = "unknown",
  cleanup?: () => Promise<void>,
): SessionInfo => {
  const now = Date.now();

  const session: SessionInfo = {
    id: sessionId,
    transportType,
    apiKeyId,
    clientId,
    createdAt: now,
    lastActivity: now,
    errorCount: 0,
    cleanup,
  };

  sessions.set(sessionId, session);

  logger.info("Session created", {
    sessionId,
    transportType,
    apiKeyId: "***",
    clientId,
  });

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
 * セッションエラーを記録
 */
export const recordSessionError = (sessionId: string): void => {
  const session = sessions.get(sessionId);
  if (session) {
    session.errorCount++;
    logger.error("Session error recorded", {
      sessionId,
      transportType: session.transportType,
      errorCount: session.errorCount,
    });
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

  const sessionDuration = Date.now() - session.createdAt;

  logger.info("Deleting session", {
    sessionId,
    transportType: session.transportType,
    durationSeconds: Math.round(sessionDuration / 1000),
    errorCount: session.errorCount,
  });

  // クリーンアップ関数を実行
  if (session.cleanup) {
    try {
      await session.cleanup();
    } catch (error) {
      logger.error("Error during session cleanup", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  sessions.delete(sessionId);
};

/**
 * 期限切れセッションのクリーンアップ
 */
export const cleanupExpiredSessions = (): void => {
  const now = Date.now();
  const expiredSessions: string[] = [];

  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
      expiredSessions.push(sessionId);
    }
  }

  for (const sessionId of expiredSessions) {
    void deleteSession(sessionId);
  }

  if (expiredSessions.length > 0) {
    logger.info("Cleaned up expired sessions", {
      count: expiredSessions.length,
      remainingSessions: sessions.size,
    });
  }
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
 * 定期的なセッションクリーンアップを開始
 */
export const startSessionCleanup = (): NodeJS.Timeout => {
  return setInterval(() => {
    cleanupExpiredSessions();
  }, SESSION_CONFIG.CLEANUP_INTERVAL);
};

/**
 * 全セッションをクリーンアップ
 */
export const cleanupAllSessions = async (): Promise<void> => {
  const cleanupPromises: Promise<void>[] = [];

  for (const sessionId of sessions.keys()) {
    cleanupPromises.push(deleteSession(sessionId));
  }

  try {
    await Promise.all(cleanupPromises);
    logger.info("All sessions cleaned up");
  } catch (error) {
    logger.error("Error during session cleanup", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
