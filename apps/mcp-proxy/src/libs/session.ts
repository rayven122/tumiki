import { randomUUID } from "crypto";
import type { SessionAuthInfo } from "../types/index.js";
import { getRedisClient } from "./redis.js";

// Transport種別
export enum TransportType {
  SSE = "sse",
  STREAMABLE_HTTP = "streamable_http",
}

// セッション情報
export type SessionInfo = {
  id: string;
  transportType: TransportType;
  clientId: string;
  createdAt: number;
  lastActivity: number;
  errorCount: number;
  cleanup?: () => Promise<void>;
  authInfo: SessionAuthInfo;
};

// セッション管理設定
export const SESSION_CONFIG = {
  /** セッションタイムアウト設定（ミリ秒） */
  SESSION_TIMEOUT: parseInt(process.env.CONNECTION_TIMEOUT_MS ?? "60000", 10),
  /** セッションクリーンアップ間隔（ミリ秒） - Redis TTL使用のため未使用 */
  CLEANUP_INTERVAL: 30000, // 30秒
  /** 最大セッション数 */
  MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS ?? "200", 10),
  /** 最大エラー数 */
  MAX_ERROR_COUNT: 10,
} as const;

// Redis キープレフィックス
const REDIS_KEY_PREFIX = "session:";
const REDIS_SESSION_COUNT_KEY = "session:count";

/**
 * Redis キーを生成
 */
const getSessionKey = (sessionId: string): string =>
  `${REDIS_KEY_PREFIX}${sessionId}`;

/**
 * セッションを JSON にシリアライズ（cleanup 関数を除く）
 */
const serializeSession = (session: SessionInfo): string => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cleanup, ...sessionData } = session;
  return JSON.stringify(sessionData);
};

/**
 * JSON をセッションにデシリアライズ
 */
const deserializeSession = (data: string): Omit<SessionInfo, "cleanup"> => {
  return JSON.parse(data) as Omit<SessionInfo, "cleanup">;
};

/**
 * 新しいセッションIDを生成
 */
export const generateSessionId = (): string => randomUUID();

/**
 * 指定されたセッションIDでセッションを作成
 */
export const createSessionWithId = async (
  sessionId: string,
  transportType: TransportType,
  authInfo: SessionAuthInfo,
  clientId = "unknown",
  cleanup?: () => Promise<void>,
): Promise<SessionInfo> => {
  const redis = await getRedisClient();
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

  // Redis に保存（TTL付き）
  const key = getSessionKey(sessionId);
  const ttlSeconds = Math.ceil(SESSION_CONFIG.SESSION_TIMEOUT / 1000);

  await redis.setex(key, ttlSeconds, serializeSession(session));

  // セッション数をインクリメント
  await redis.incr(REDIS_SESSION_COUNT_KEY);

  return session;
};

/**
 * セッションを取得
 */
export const getSession = async (
  sessionId: string,
): Promise<SessionInfo | undefined> => {
  try {
    const redis = await getRedisClient();
    const key = getSessionKey(sessionId);
    const data = await redis.get<string>(key);

    if (!data) {
      return undefined;
    }

    const sessionData = deserializeSession(data);
    return { ...sessionData, cleanup: undefined };
  } catch (error) {
    console.error("セッション取得エラー:", error);
    return undefined;
  }
};

/**
 * セッションアクティビティを更新
 */
export const updateSessionActivity = async (
  sessionId: string,
  clientId?: string,
): Promise<void> => {
  try {
    const session = await getSession(sessionId);
    if (!session) {
      return;
    }

    session.lastActivity = Date.now();
    if (clientId && clientId !== "unknown") {
      session.clientId = clientId;
    }

    const redis = await getRedisClient();
    const key = getSessionKey(sessionId);
    const ttlSeconds = Math.ceil(SESSION_CONFIG.SESSION_TIMEOUT / 1000);

    // セッションを更新し、TTLをリセット
    await redis.setex(key, ttlSeconds, serializeSession(session));
  } catch (error) {
    console.error("セッションアクティビティ更新エラー:", error);
  }
};

/**
 * セッションの有効性をチェック
 */
export const isSessionValid = async (sessionId: string): Promise<boolean> => {
  try {
    const session = await getSession(sessionId);
    if (!session) {
      return false;
    }

    const now = Date.now();
    const timeSinceActivity = now - session.lastActivity;

    return (
      timeSinceActivity <= SESSION_CONFIG.SESSION_TIMEOUT &&
      session.errorCount < SESSION_CONFIG.MAX_ERROR_COUNT
    );
  } catch (error) {
    console.error("セッション有効性チェックエラー:", error);
    return false;
  }
};

/**
 * セッションを削除
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    const session = await getSession(sessionId);
    if (!session) {
      return;
    }

    // クリーンアップ関数を実行
    await session.cleanup?.();

    const redis = await getRedisClient();
    const key = getSessionKey(sessionId);
    await redis.del(key);

    // セッション数をデクリメント
    await redis.decr(REDIS_SESSION_COUNT_KEY);
  } catch (error) {
    console.error("セッション削除エラー:", error);
  }
};

/**
 * 新しいセッションを作成可能かチェック
 */
export const canCreateNewSession = async (): Promise<boolean> => {
  try {
    const redis = await getRedisClient();
    const count = await redis.get<string>(REDIS_SESSION_COUNT_KEY);
    const sessionCount = count ? parseInt(count, 10) : 0;

    return sessionCount < SESSION_CONFIG.MAX_SESSIONS;
  } catch (error) {
    console.error("セッション数チェックエラー:", error);
    // エラー時は安全側に倒して作成を許可しない
    return false;
  }
};

/**
 * 期限切れセッションのクリーンアップ
 * 注: Redis の TTL により自動削除されるため、このメソッドは主に互換性のために残されています
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    const redis = await getRedisClient();

    // session:* パターンで全セッションキーを取得
    const keys = await redis.keys(`${REDIS_KEY_PREFIX}*`);

    let expiredCount = 0;

    for (const key of keys) {
      // session:count は除外
      if (key === REDIS_SESSION_COUNT_KEY) {
        continue;
      }

      const sessionId = key.replace(REDIS_KEY_PREFIX, "");
      const session = await getSession(sessionId);

      if (!session) {
        continue;
      }

      const now = Date.now();
      if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
        await deleteSession(sessionId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(
        `${expiredCount} 件の期限切れセッションをクリーンアップしました`,
      );
    }
  } catch (error) {
    console.error("セッションクリーンアップエラー:", error);
  }
};

// 定期的なクリーンアップタスクを開始
// 注: Redis の TTL により自動削除されますが、念のため定期クリーンアップも実行
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    void cleanupExpiredSessions();
  }, SESSION_CONFIG.CLEANUP_INTERVAL);
}

/**
 * 全セッション数を取得（デバッグ/監視用）
 */
export const getSessionCount = async (): Promise<number> => {
  try {
    const redis = await getRedisClient();
    const count = await redis.get<string>(REDIS_SESSION_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error("セッション数取得エラー:", error);
    return 0;
  }
};

/**
 * 全セッションIDを取得（デバッグ用）
 */
export const getAllSessionIds = async (): Promise<string[]> => {
  try {
    const redis = await getRedisClient();
    const keys = await redis.keys(`${REDIS_KEY_PREFIX}*`);

    return keys
      .filter((key) => key !== REDIS_SESSION_COUNT_KEY)
      .map((key) => key.replace(REDIS_KEY_PREFIX, ""));
  } catch (error) {
    console.error("全セッションID取得エラー:", error);
    return [];
  }
};
