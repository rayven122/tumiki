/**
 * ユーザーリポジトリ
 *
 * ユーザー関連のDBクエリとRedisキャッシュを提供。
 * Keycloak ID / メールアドレスから Tumiki User ID を解決する。
 * Redis キャッシュで高速化（TTL: 5分）
 */

import { db } from "@tumiki/db/server";
import { getRedisClient } from "../../cache/redis.js";
import { logDebug, logError, logWarn } from "../../../shared/logger/index.js";

// キャッシュのTTL（秒）
const CACHE_TTL_SECONDS = 300; // 5分

// ネガティブキャッシュの有効/無効
// DISABLE_NEGATIVE_CACHE=true で無効化（開発環境向け）
const ENABLE_NEGATIVE_CACHE = process.env.DISABLE_NEGATIVE_CACHE !== "true";

/**
 * Keycloak ID (providerAccountId) から Tumiki User ID を取得
 *
 * Account テーブルで provider="keycloak" かつ providerAccountId=keycloakId の
 * レコードを検索し、対応する userId を返す。
 *
 * @param keycloakId - Keycloak の subject claim (JWT sub)
 * @returns User ID（見つからない場合はnull）
 */
export const getUserIdFromKeycloakId = async (
  keycloakId: string,
): Promise<string | null> => {
  const cacheKey = `keycloak:user:${keycloakId}`;

  // キャッシュ確認
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        logDebug("Keycloak user cache hit", { cacheKey });
        // ネガティブキャッシュのチェック
        if (cached === "null") {
          if (!ENABLE_NEGATIVE_CACHE) {
            logDebug("Negative cache ignored due to DISABLE_NEGATIVE_CACHE");
            await redis.del(cacheKey);
            // フォールスルーしてDBから取得
          } else {
            return null;
          }
        } else {
          return cached;
        }
      }
    }
  } catch (error) {
    logError("Redis cache error for keycloak user", error as Error);
    // キャッシュエラー時はフォールスルー（DB直接アクセス）
  }

  // DBから取得: Account.providerAccountId = keycloakId で検索
  let userId: string | null = null;
  try {
    const account = await db.account.findFirst({
      where: {
        provider: "keycloak",
        providerAccountId: keycloakId,
      },
      select: { userId: true },
    });

    userId = account?.userId ?? null;

    if (!userId) {
      logWarn("User not found for Keycloak ID", { keycloakId });
    }
  } catch (error) {
    logError("Failed to get user from Keycloak ID", error as Error, {
      keycloakId,
    });
    throw error;
  }

  // キャッシュに保存（5分）
  try {
    const redis = await getRedisClient();
    if (redis) {
      if (userId === null) {
        if (ENABLE_NEGATIVE_CACHE) {
          await redis.setEx(cacheKey, CACHE_TTL_SECONDS, "null");
        }
      } else {
        await redis.setEx(cacheKey, CACHE_TTL_SECONDS, userId);
      }
    }
  } catch (error) {
    logError("Redis cache save error for keycloak user", error as Error);
  }

  return userId;
};

/**
 * emailからTumiki User IDを解決
 *
 * JWT の sub クレームが存在しない場合のフォールバック用。
 * User テーブルで email を検索し、対応する userId を返す。
 *
 * @param email - ユーザーのメールアドレス
 * @returns User ID（見つからない場合はnull）
 */
export const getUserIdByEmail = async (
  email: string,
): Promise<string | null> => {
  const cacheKey = `email:user:${email}`;

  // キャッシュ確認
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        logDebug("Email user cache hit", { cacheKey });
        if (cached === "null") {
          if (!ENABLE_NEGATIVE_CACHE) {
            logDebug("Negative cache ignored due to DISABLE_NEGATIVE_CACHE");
            await redis.del(cacheKey);
          } else {
            return null;
          }
        } else {
          return cached;
        }
      }
    }
  } catch (error) {
    logError("Redis cache error for email user", error as Error);
  }

  // DBから取得: User.email で検索
  let userId: string | null = null;
  try {
    const user = await db.user.findFirst({
      where: {
        email: email,
      },
      select: { id: true },
    });

    userId = user?.id ?? null;

    if (!userId) {
      logWarn("User not found for email", { email });
    }
  } catch (error) {
    logError("Failed to get user from email", error as Error, {
      email,
    });
    throw error;
  }

  // キャッシュに保存（5分）
  try {
    const redis = await getRedisClient();
    if (redis) {
      if (userId === null) {
        if (ENABLE_NEGATIVE_CACHE) {
          await redis.setEx(cacheKey, CACHE_TTL_SECONDS, "null");
        }
      } else {
        await redis.setEx(cacheKey, CACHE_TTL_SECONDS, userId);
      }
    }
  } catch (error) {
    logError("Redis cache save error for email user", error as Error);
  }

  return userId;
};

/**
 * Keycloakユーザーキャッシュを無効化
 *
 * Account 追加・削除時に呼び出す。
 */
export const invalidateKeycloakUserCache = async (
  keycloakId: string,
): Promise<void> => {
  const cacheKey = `keycloak:user:${keycloakId}`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug(
        "Redis not available, skipping keycloak user cache invalidation",
      );
      return;
    }

    await redis.del(cacheKey);
    logDebug("Keycloak user cache invalidated", { keycloakId });
  } catch (error) {
    logError("Failed to invalidate keycloak user cache", error as Error, {
      keycloakId,
    });
  }
};
