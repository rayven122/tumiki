/**
 * OAuth Token Cache Manager
 *
 * Redisキャッシュを使用したトークン管理（純粋関数 + 依存性注入）
 */

import type { RedisClientType } from "redis";

import type { DecryptedToken } from "./types.js";
import { logger } from "./logger.js";

/**
 * キャッシュキーを生成
 *
 * @param userId ユーザーID
 * @param mcpServerId MCPサーバーID
 * @returns キャッシュキー
 */
export const getCacheKey = (userId: string, mcpServerId: string): string => {
  return `backend_token:${userId}:${mcpServerId}`;
};

/**
 * Redisキャッシュからトークンを取得
 *
 * @param client Redisクライアント
 * @param key キャッシュキー
 * @returns トークン（存在しない場合はnull）
 */
export const getFromCache = async (
  client: RedisClientType | null,
  key: string,
): Promise<DecryptedToken | null> => {
  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as DecryptedToken;
  } catch (error) {
    logger.error("Redis get error", { key, error });
    return null;
  }
};

/**
 * トークンをRedisキャッシュに保存
 *
 * @param client Redisクライアント
 * @param key キャッシュキー
 * @param token トークン
 */
export const cacheToken = async (
  client: RedisClientType | null,
  key: string,
  token: DecryptedToken,
): Promise<void> => {
  if (!client) {
    return;
  }

  try {
    const ttl = calculateTTL(token.expiresAt);
    await client.set(key, JSON.stringify(token), { EX: ttl });
    logger.debug("Token cached", { key, ttl });
  } catch (error) {
    logger.error("Redis set error", { key, error });
  }
};

/**
 * キャッシュを無効化
 *
 * @param client Redisクライアント
 * @param userId ユーザーID
 * @param mcpServerId MCPサーバーID
 */
export const invalidateCache = async (
  client: RedisClientType | null,
  userId: string,
  mcpServerId: string,
): Promise<void> => {
  if (!client) {
    return;
  }

  const key = getCacheKey(userId, mcpServerId);
  try {
    await client.del(key);
    logger.debug("Cache invalidated", { key });
  } catch (error) {
    logger.error("Redis delete error", { key, error });
  }
};

/**
 * キャッシュTTLを計算
 *
 * @param expiresAt 有効期限
 * @returns TTL（秒）
 */
const calculateTTL = (expiresAt: Date | null): number => {
  if (!expiresAt) {
    // 有効期限がない場合は1時間
    return 3600;
  }

  const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  // 最小1秒、最大1時間
  return Math.max(1, Math.min(ttlSeconds, 3600));
};
