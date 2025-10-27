/**
 * Redis接続管理
 */

import Redis, { type Redis as RedisInstance } from "ioredis";

let redisClient: RedisInstance | null = null;

export type RedisConfig = {
  host: string;
  port: number;
  password?: string;
  db?: number;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
};

const getDefaultRedisConfig = (): RedisConfig => ({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
});

export const initializeRedis = (
  config?: Partial<RedisConfig>,
): RedisInstance | null => {
  if (process.env.REDIS_ENABLED === "false") {
    console.info("Redis is disabled by environment variable");
    return null;
  }

  try {
    const finalConfig = { ...getDefaultRedisConfig(), ...config };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new (Redis as any)({
      host: finalConfig.host,
      port: finalConfig.port,
      password: finalConfig.password,
      db: finalConfig.db,
      connectTimeout: finalConfig.connectTimeout,
      maxRetriesPerRequest: finalConfig.maxRetriesPerRequest,
      lazyConnect: true,
    }) as RedisInstance;

    client.on("connect", () => {
      console.info("Redis client connected");
    });

    client.on("error", (err: Error) => {
      console.error("Redis client error:", err.message);
    });

    void client.connect().catch((err: Error) => {
      console.error("Failed to connect to Redis:", err.message);
      redisClient = null;
    });

    redisClient = client;
    return redisClient;
  } catch (error) {
    console.error("Failed to initialize Redis client:", error);
    return null;
  }
};

export const getRedisClient = (): RedisInstance | null => {
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
    } catch (error) {
      console.error("Error closing Redis client:", error);
    }
  }
};

export const isRedisConnected = (): boolean => {
  return redisClient?.status === "ready";
};

export const checkRedisHealth = async (): Promise<boolean> => {
  if (!redisClient || !isRedisConnected()) {
    return false;
  }

  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    return false;
  }
};
