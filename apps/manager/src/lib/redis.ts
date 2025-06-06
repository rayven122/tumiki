import { createClient } from "redis";

// Redis クライアントをシングルトンとして保持
let redisClient: ReturnType<typeof createClient> | null = null;

// Redis接続とキャッシュ操作のためのヘルパー関数
async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        // 接続を維持するためのオプション
        // サーバーレス環境のため、接続を維持しない
        keepAlive: false,
      },
    });
    redisClient.on("error", (err) => console.log("Redis Client Error", err));
    await redisClient.connect();
  }
  return redisClient;
}

// アプリケーション終了時に接続を閉じる
process.on("beforeExit", () => {
  if (redisClient) {
    redisClient.destroy();
    redisClient = null;
  }
});

// キャッシュから取得する関数
export async function getFromCache(key: string) {
  const client = await getRedisClient();
  try {
    const value = await client.get(key);
    return value ? (JSON.parse(value) as object) : null;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

// キャッシュに保存する関数
export async function setInCache(key: string, value: unknown, ttlSeconds = 60) {
  const client = await getRedisClient();
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

// キャッシュを無効化する関数
export async function invalidateCache(key: string | string[]) {
  const client = await getRedisClient();
  try {
    await client.del(key);
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}
