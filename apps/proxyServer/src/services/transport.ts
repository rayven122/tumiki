import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "../lib/logger.js";
import { config } from "../lib/config.js";

// セッション管理
export const transports = new Map<string, StreamableHTTPServerTransport>();
export const sessions = new Map<
  string,
  {
    id: string;
    apiKeyId: string;
    clientId: string;
    createdAt: number;
    lastActivity: number;
  }
>();

// Streamable HTTP設定
export const STREAMABLE_HTTP_CONFIG = {
  /** セッションタイムアウト設定（ミリ秒） */
  SESSION_TIMEOUT: config.timeouts.connection,
  /** セッションクリーンアップ間隔（ミリ秒） */
  CLEANUP_INTERVAL: config.timeouts.keepalive,
  /** 最大セッション数 */
  MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS || "1000", 10),
} as const;

/**
 * 新しいStreamableHTTPServerTransportを作成
 */
export const createStreamableTransport = (
  apiKeyId: string,
): StreamableHTTPServerTransport => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId: string) => {
      logger.info("StreamableHTTP session initialized", {
        sessionId,
        apiKeyId,
      });

      // セッション情報を保存
      sessions.set(sessionId, {
        id: sessionId,
        apiKeyId,
        clientId: "unknown", // 後でHTTPヘッダーから取得
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });

      // transportを保存
      transports.set(sessionId, transport);
    },
  });

  return transport;
};

/**
 * セッションIDからtransportを取得
 */
export const getTransportBySessionId = (
  sessionId: string,
): StreamableHTTPServerTransport | undefined => {
  return transports.get(sessionId);
};

/**
 * セッション情報を更新
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

  return timeSinceActivity <= STREAMABLE_HTTP_CONFIG.SESSION_TIMEOUT;
};

/**
 * 期限切れセッションのクリーンアップ
 */
export const cleanupExpiredSessions = (): void => {
  const now = Date.now();
  const expiredSessions: string[] = [];

  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > STREAMABLE_HTTP_CONFIG.SESSION_TIMEOUT) {
      expiredSessions.push(sessionId);
    }
  }

  for (const sessionId of expiredSessions) {
    const transport = transports.get(sessionId);
    if (transport) {
      try {
        // transportのクリーンアップ（必要に応じて）
        logger.info("Cleaning up expired session", { sessionId });
      } catch (error) {
        logger.error("Error cleaning up transport", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    transports.delete(sessionId);
    sessions.delete(sessionId);
  }

  if (expiredSessions.length > 0) {
    logger.info("Cleaned up expired sessions", {
      count: expiredSessions.length,
      remainingSessions: sessions.size,
    });
  }
};

/**
 * 全セッション統計を取得
 */
export const getSessionStats = () => {
  return {
    totalSessions: sessions.size,
    activeSessions: Array.from(sessions.values()).filter(
      (session) =>
        Date.now() - session.lastActivity <=
        STREAMABLE_HTTP_CONFIG.SESSION_TIMEOUT,
    ).length,
    transports: transports.size,
  };
};

/**
 * 定期的なセッションクリーンアップを開始
 */
export const startSessionCleanup = (): NodeJS.Timeout => {
  return setInterval(() => {
    cleanupExpiredSessions();
  }, STREAMABLE_HTTP_CONFIG.CLEANUP_INTERVAL);
};

// セッション制限チェック
export const canCreateNewSession = (): boolean => {
  return sessions.size < STREAMABLE_HTTP_CONFIG.MAX_SESSIONS;
};
