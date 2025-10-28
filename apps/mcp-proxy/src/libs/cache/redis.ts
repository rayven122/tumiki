import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { logError, logInfo } from "../logger/index.js";

let redisClient: RedisClientType | null = null;
let isConnecting = false;

/**
 * Redisクライアントのシングルトンインスタンスを取得
 * REDIS_URL環境変数が設定されていない場合はnullを返す（キャッシュ無効）
 */
export const getRedisClient = async (): Promise<RedisClientType | null> => {
  const redisUrl = process.env.REDIS_URL;

  // Redis URLが設定されていない場合はキャッシュを使用しない
  if (!redisUrl) {
    logInfo("Redis URL not configured, cache disabled");
    return null;
  }

  // 既に接続済みの場合はそのまま返す
  if (redisClient?.isOpen) {
    return redisClient;
  }

  // 接続中の場合は待機
  if (isConnecting) {
    // 最大5秒待機
    const maxWaitTime = 5000;
    const startTime = Date.now();
    while (isConnecting && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (redisClient?.isOpen) {
      return redisClient;
    }
  }

  try {
    isConnecting = true;

    // 新しいクライアントを作成
    redisClient = createClient({
      url: redisUrl,
      socket: {
        // Upstash Redisはタイムアウトが長めでも問題ない
        connectTimeout: 10000, // 10秒
        reconnectStrategy: (retries) => {
          // 最大5回まで再接続を試みる
          if (retries > 5) {
            logError(
              "Redis reconnection failed after 5 retries",
              new Error("Max reconnection attempts reached"),
            );
            return new Error("Max reconnection attempts reached");
          }
          // 指数バックオフ: 100ms, 200ms, 400ms, 800ms, 1600ms
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // エラーハンドリング
    redisClient.on("error", (err: Error) => {
      logError("Redis client error", err);
    });

    redisClient.on("connect", () => {
      logInfo("Redis client connected");
    });

    redisClient.on("ready", () => {
      logInfo("Redis client ready");
    });

    redisClient.on("reconnecting", () => {
      logInfo("Redis client reconnecting");
    });

    // 接続
    await redisClient.connect();

    logInfo("Redis client initialized successfully");

    return redisClient;
  } catch (error) {
    logError("Failed to initialize Redis client", error as Error);
    redisClient = null;
    return null;
  } finally {
    isConnecting = false;
  }
};

/**
 * Redisクライアントをクローズ（graceful shutdown用）
 */
export const closeRedisClient = async (): Promise<void> => {
  if (redisClient?.isOpen) {
    try {
      await redisClient.quit();
      logInfo("Redis client closed");
    } catch (error) {
      logError("Failed to close Redis client", error as Error);
    } finally {
      redisClient = null;
    }
  }
};
