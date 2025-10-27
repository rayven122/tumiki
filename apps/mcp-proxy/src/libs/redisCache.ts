/**
 * Redis分散キャッシュアダプター
 */

import { LRUCache } from "lru-cache";
import { getRedisClient } from "./redis.js";

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type DistributedCacheOptions = {
  ttl: number;
  max?: number;
  prefix?: string;
};

export class DistributedCache<T> {
  private lruCache: LRUCache<string, CacheEntry<T>>;
  private ttl: number;
  private prefix: string;

  constructor(options: DistributedCacheOptions) {
    this.ttl = options.ttl;
    this.prefix = options.prefix || "cache:";

    this.lruCache = new LRUCache<string, CacheEntry<T>>({
      max: options.max || 500,
      ttl: options.ttl,
    });
  }

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<T | undefined> {
    const prefixedKey = this.prefixKey(key);
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get(prefixedKey);
        if (cached) {
          const entry: CacheEntry<T> = JSON.parse(cached);
          if (entry.expiresAt > Date.now()) {
            return entry.value;
          }
          await redis.del(prefixedKey);
        }
      } catch (error) {
        console.warn("Redis get failed, falling back to LRU cache");
      }
    }

    const lruEntry = this.lruCache.get(prefixedKey);
    if (lruEntry && lruEntry.expiresAt > Date.now()) {
      return lruEntry.value;
    }

    return undefined;
  }

  async set(key: string, value: T): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + this.ttl,
    };

    const redis = getRedisClient();

    if (redis) {
      try {
        await redis.setex(
          prefixedKey,
          Math.ceil(this.ttl / 1000),
          JSON.stringify(entry),
        );
      } catch (error) {
        console.warn("Redis set failed, falling back to LRU cache");
      }
    }

    this.lruCache.set(prefixedKey, entry);
  }

  async delete(key: string): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    const redis = getRedisClient();

    if (redis) {
      try {
        await redis.del(prefixedKey);
      } catch (error) {
        console.warn("Redis delete failed");
      }
    }

    this.lruCache.delete(prefixedKey);
  }

  async clear(): Promise<void> {
    const redis = getRedisClient();

    if (redis) {
      try {
        const keys = await redis.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (error) {
        console.warn("Redis clear failed");
      }
    }

    this.lruCache.clear();
  }

  size(): number {
    return this.lruCache.size;
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }
}

export const createDistributedCache = <T>(
  options: DistributedCacheOptions,
): DistributedCache<T> => {
  return new DistributedCache<T>(options);
};
