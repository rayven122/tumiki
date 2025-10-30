/**
 * OAuth Token Cache Manager
 *
 * Redisキャッシュを使用したトークン管理（暗号化 + バリデーション対応）
 */

import type { DecryptedToken } from "./types.js";
import { decrypt, encrypt } from "./crypto.js";
import { logger } from "./logger.js";
import { getRedisClient } from "./redis-connection.js";
import { decryptedTokenSchema } from "./types.js";

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
 * @param key キャッシュキー
 * @returns トークン（存在しない場合はnull）
 */
export const getFromCache = async (
  key: string,
): Promise<DecryptedToken | null> => {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const encryptedValue = await client.get(key);
    if (!encryptedValue) {
      return null;
    }

    // 復号化
    const decryptedValue = decrypt(encryptedValue);

    // JSONパース & Zodバリデーション
    const parsed: unknown = JSON.parse(decryptedValue);
    const validated = decryptedTokenSchema.parse(parsed);

    return validated;
  } catch (error) {
    logger.error("Redis get error", { key, error });
    return null;
  }
};

/**
 * トークンをRedisキャッシュに保存
 *
 * @param key キャッシュキー
 * @param token トークン
 */
export const cacheToken = async (
  key: string,
  token: DecryptedToken,
): Promise<void> => {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  try {
    // Zodバリデーション（保存前のデータ検証）
    const validated = decryptedTokenSchema.parse(token);

    // JSON文字列化
    const jsonString = JSON.stringify(validated);

    // 暗号化
    const encryptedValue = encrypt(jsonString);

    // TTL計算
    const ttl = calculateTTL(validated.expiresAt);

    // Redis保存
    await client.set(key, encryptedValue, { EX: ttl });
    logger.debug("Token cached (encrypted)", { key, ttl });
  } catch (error) {
    logger.error("Redis set error", { key, error });
  }
};

/**
 * キャッシュを無効化
 *
 * @param userId ユーザーID
 * @param mcpServerId MCPサーバーID
 */
export const invalidateCache = async (
  userId: string,
  mcpServerId: string,
): Promise<void> => {
  const client = await getRedisClient();
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
