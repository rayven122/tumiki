import { Redis } from "@upstash/redis";

// Upstash Redis クライアントの型
export type RedisClientType = Redis;

// シングルトンインスタンス
let redisClient: RedisClientType | null = null;

/**
 * Upstash Redis クライアントを取得（シングルトン）
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Upstash REST API を使用した Redis クライアント
    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    });

    redisClient = client;
    console.log("Upstash Redis クライアントを作成しました");

    return client;
  } catch (error) {
    console.error("Upstash Redis 接続エラー:", error);
    throw error;
  }
};

/**
 * Redis クライアントを切断
 * 注: Upstash は HTTP REST API のため、明示的な切断は不要
 */
export const disconnectRedis = async (): Promise<void> => {
  redisClient = null;
  console.log("Upstash Redis クライアントをクリアしました");
};

/**
 * Graceful shutdown 処理
 * 注: Upstash は HTTP REST API のため、接続プールなし
 */
const setupGracefulShutdown = () => {
  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];

  for (const signal of signals) {
    process.on(signal, () => {
      void (async () => {
        console.log(`${signal} を受信しました。Redis をクリアします...`);
        await disconnectRedis();
        process.exit(0);
      })();
    });
  }
};

// テスト環境以外で graceful shutdown を設定
if (process.env.NODE_ENV !== "test") {
  setupGracefulShutdown();
}
