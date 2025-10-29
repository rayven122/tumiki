import { createClient } from "redis";
import { logError, logInfo } from "../logger/index.js";

// createClientの戻り値の型を直接使用してモジュール解決の問題を回避
type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let connectingPromise: Promise<RedisClient | null> | null = null;

/**
 * Redis接続を作成する内部関数
 */
const createConnection = async (
  redisUrl: string,
): Promise<RedisClient | null> => {
  try {
    // 新しいクライアントを作成
    const client = createClient({
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
    client.on("error", (err: Error) => {
      logError("Redis client error", err);
    });

    client.on("connect", () => {
      logInfo("Redis client connected");
    });

    client.on("ready", () => {
      logInfo("Redis client ready");
    });

    client.on("reconnecting", () => {
      logInfo("Redis client reconnecting");
    });

    // 接続
    await client.connect();

    logInfo("Redis client initialized successfully");

    // 接続成功したらグローバル変数に保存
    redisClient = client;
    return client;
  } catch (error) {
    logError("Failed to initialize Redis client", error as Error);
    redisClient = null;
    return null;
  }
};

/**
 * Redisクライアントのシングルトンインスタンスを取得
 * REDIS_URL環境変数が設定されていない場合はnullを返す（キャッシュ無効）
 */
export const getRedisClient = async (): Promise<RedisClient | null> => {
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

  // 接続中の場合は既存のPromiseを返す（競合状態を回避）
  if (connectingPromise) {
    return connectingPromise;
  }

  // 新しい接続を開始
  connectingPromise = createConnection(redisUrl);

  try {
    const client = await connectingPromise;
    return client;
  } finally {
    connectingPromise = null;
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
