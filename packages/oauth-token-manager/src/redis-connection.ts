import type { RedisClientType } from "redis";
import { createClient } from "redis";

import { logger } from "./logger.js";

/**
 * Redis Connection Pool
 *
 * Google Cloud Run サーバーレス環境向けのRedis接続管理
 * - コンテナごとの接続再利用
 * - 遅延初期化（lazy initialization）
 * - グレースフルシャットダウン対応
 */

/**
 * Redis接続プールクラス
 * サーバーレス環境では、各コンテナインスタンスでシングルトンとして管理
 */
class RedisConnectionPool {
  private static instance: RedisConnectionPool | null = null;
  private client: RedisClientType | null = null;
  private connecting: Promise<RedisClientType> | null = null;

  private constructor() {
    // privateコンストラクター
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): RedisConnectionPool {
    if (!RedisConnectionPool.instance) {
      RedisConnectionPool.instance = new RedisConnectionPool();
    }
    return RedisConnectionPool.instance;
  }

  /**
   * Redis接続を取得（遅延初期化）
   * 複数の並列リクエストで同時に呼ばれても、接続は1回のみ確立
   */
  async getClient(): Promise<RedisClientType | null> {
    // 既に接続済み
    if (this.client?.isOpen) {
      return this.client;
    }

    // 接続中の場合は、その接続処理を待つ
    if (this.connecting) {
      return await this.connecting;
    }

    // 新規接続を開始
    this.connecting = this.connect();

    try {
      this.client = await this.connecting;
      return this.client;
    } finally {
      this.connecting = null;
    }
  }

  /**
   * Redis接続を確立
   */
  private async connect(): Promise<RedisClientType> {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      logger.warn("REDIS_URL is not set. Redis caching is disabled.");
      throw new Error("REDIS_URL is not configured");
    }

    try {
      const client = createClient({
        url: redisUrl,
        socket: {
          // Cloud Run環境向けのタイムアウト設定
          connectTimeout: 10000, // 10秒
          keepAlive: true,
        },
      });

      // エラーハンドリング
      client.on("error", (error: unknown) => {
        logger.error("Redis client error", { error });
      });

      client.on("connect", () => {
        logger.info("Redis client connected");
      });

      client.on("disconnect", () => {
        logger.info("Redis client disconnected");
      });

      await client.connect();
      logger.info("Redis connection established");

      return client as RedisClientType;
    } catch (error) {
      logger.error("Failed to connect to Redis", { error });
      throw error;
    }
  }

  /**
   * クリーンアップ処理（グレースフルシャットダウン）
   */
  async cleanup(): Promise<void> {
    if (this.client?.isOpen) {
      try {
        await this.client.quit();
        logger.info("Redis connection closed gracefully");
      } catch (error) {
        logger.error("Error closing Redis connection", { error });
      } finally {
        this.client = null;
        RedisConnectionPool.instance = null;
      }
    }
  }
}

/**
 * Redis接続を取得する関数API
 * サーバーレス環境では、各コンテナインスタンスで接続を再利用
 *
 * @returns Redis接続（接続失敗時はnull）
 */
export const getRedisClient = async (): Promise<RedisClientType | null> => {
  try {
    return await RedisConnectionPool.getInstance().getClient();
  } catch (error) {
    logger.error("Failed to get Redis client", { error });
    return null; // 接続失敗時はnullを返す（キャッシュなしで動作可能）
  }
};

/**
 * Redis接続のクリーンアップ
 * 主にテストやグレースフルシャットダウン時に使用
 */
export const cleanupRedisConnection = async (): Promise<void> => {
  await RedisConnectionPool.getInstance().cleanup();
};
