/**
 * McpServer 検索サービス
 *
 * OAuth認証時にMcpServerからorganizationIdを取得するためのサービス。
 * Redis キャッシュで高速化（TTL: 5分）
 */

import { db } from "@tumiki/db/server";
import { getRedisClient } from "../libs/cache/redis.js";
import { logDebug, logError, logWarn } from "../libs/logger/index.js";

/**
 * 認証タイプ（Prisma の AuthType enum と同期）
 */
export type AuthType = "NONE" | "API_KEY" | "OAUTH";

/**
 * McpServer検索結果の型
 */
export type McpServerLookupResult = {
  id: string;
  organizationId: string;
  deletedAt: Date | null;
  authType: AuthType;
};

/**
 * キャッシュ用のシリアライズ型（Date → string）
 */
type CachedMcpServerResult = {
  id: string;
  organizationId: string;
  deletedAt: string | null;
  authType: AuthType;
};

// キャッシュのTTL（秒）
const CACHE_TTL_SECONDS = 300; // 5分

// ネガティブキャッシュの有効/無効
// DISABLE_NEGATIVE_CACHE=true で無効化（開発環境向け）
const ENABLE_NEGATIVE_CACHE = process.env.DISABLE_NEGATIVE_CACHE !== "true";

/**
 * McpServerのorganizationIdを取得
 *
 * @param mcpServerId - McpServer ID
 * @returns McpServer情報（見つからない場合はnull）
 */
export const getMcpServerOrganization = async (
  mcpServerId: string,
): Promise<McpServerLookupResult | null> => {
  // キャッシュキー
  const cacheKey = `mcpserver:org:${mcpServerId}`;

  // キャッシュ確認
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        logDebug("McpServer cache hit", { cacheKey });
        // ネガティブキャッシュのチェック
        if (cached === "null") {
          // DISABLE_NEGATIVE_CACHE=true の場合はキャッシュを無視してDBから再取得
          if (!ENABLE_NEGATIVE_CACHE) {
            logDebug("Negative cache ignored due to DISABLE_NEGATIVE_CACHE");
            await redis.del(cacheKey);
            // フォールスルーしてDBから取得
          } else {
            return null;
          }
        } else {
          const parsed = JSON.parse(cached) as CachedMcpServerResult;
          return {
            id: parsed.id,
            organizationId: parsed.organizationId,
            deletedAt: parsed.deletedAt ? new Date(parsed.deletedAt) : null,
            authType: parsed.authType,
          };
        }
      }
    }
  } catch (error) {
    logError("Redis cache error", error as Error);
    // キャッシュエラー時はフォールスルー（DB直接アクセス）
  }

  // DBから取得
  const result = await getMcpServerFromDB(mcpServerId);

  // キャッシュに保存（5分）
  try {
    const redis = await getRedisClient();
    if (redis) {
      // ネガティブキャッシュが有効な場合のみnullをキャッシュ
      if (result === null) {
        if (ENABLE_NEGATIVE_CACHE) {
          await redis.setEx(cacheKey, CACHE_TTL_SECONDS, "null");
        }
      } else {
        const cacheValue: CachedMcpServerResult = {
          id: result.id,
          organizationId: result.organizationId,
          deletedAt: result.deletedAt ? result.deletedAt.toISOString() : null,
          authType: result.authType,
        };
        await redis.setEx(
          cacheKey,
          CACHE_TTL_SECONDS,
          JSON.stringify(cacheValue),
        );
      }
    }
  } catch (error) {
    logError("Redis cache save error", error as Error);
  }

  return result;
};

/**
 * DBからMcpServerを取得する内部関数
 */
const getMcpServerFromDB = async (
  mcpServerId: string,
): Promise<McpServerLookupResult | null> => {
  try {
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      select: {
        id: true,
        organizationId: true,
        deletedAt: true,
        authType: true,
      },
    });

    if (!mcpServer) {
      logWarn("McpServer not found", { mcpServerId });
      return null;
    }

    return mcpServer;
  } catch (error) {
    logError("Failed to get McpServer from DB", error as Error, {
      mcpServerId,
    });
    throw error;
  }
};

/**
 * ユーザーが組織のメンバーかどうかを確認
 *
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns メンバーであればtrue、そうでなければfalse
 */
export const checkOrganizationMembership = async (
  organizationId: string,
  userId: string,
): Promise<boolean> => {
  const cacheKey = `orgmember:${organizationId}:${userId}`;

  // キャッシュ確認
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        logDebug("Organization membership cache hit", { cacheKey });
        return cached === "true";
      }
    }
  } catch (error) {
    logError("Redis cache error for membership check", error as Error);
    // キャッシュエラー時はフォールスルー（DB直接アクセス）
  }

  // DBから確認
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: { id: true },
  });

  const isMember = member !== null;

  // キャッシュに保存（5分）
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.setEx(
        cacheKey,
        CACHE_TTL_SECONDS,
        isMember ? "true" : "false",
      );
    }
  } catch (error) {
    logError("Redis cache save error for membership", error as Error);
  }

  return isMember;
};

/**
 * 組織メンバーシップキャッシュを無効化
 *
 * メンバー追加・削除時に呼び出す。
 */
export const invalidateOrganizationMembershipCache = async (
  organizationId: string,
  userId: string,
): Promise<void> => {
  const cacheKey = `orgmember:${organizationId}:${userId}`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, skipping membership cache invalidation");
      return;
    }

    await redis.del(cacheKey);
    logDebug("Organization membership cache invalidated", {
      organizationId,
      userId,
    });
  } catch (error) {
    logError(
      "Failed to invalidate organization membership cache",
      error as Error,
      { organizationId, userId },
    );
  }
};

/**
 * McpServerキャッシュを無効化
 *
 * McpServer削除・更新時に呼び出す。
 */
export const invalidateMcpServerCache = async (
  mcpServerId: string,
): Promise<void> => {
  const cacheKey = `mcpserver:org:${mcpServerId}`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, skipping cache invalidation");
      return;
    }

    await redis.del(cacheKey);
    logDebug("McpServer cache invalidated", { mcpServerId });
  } catch (error) {
    logError("Failed to invalidate McpServer cache", error as Error, {
      mcpServerId,
    });
  }
};

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

/**
 * McpServerTemplateInstance 検索結果の型
 */
export type TemplateInstanceLookupResult = {
  id: string;
  mcpServerId: string;
};

/**
 * McpServerTemplateInstance を ID で取得
 *
 * Protected Resource Metadata エンドポイントで
 * インスタンスの存在確認に使用する。
 *
 * @param instanceId - McpServerTemplateInstance ID
 * @returns インスタンス情報（見つからない場合はnull）
 */
export const getTemplateInstanceById = async (
  instanceId: string,
): Promise<TemplateInstanceLookupResult | null> => {
  // キャッシュキー
  const cacheKey = `template:instance:${instanceId}`;

  // キャッシュ確認
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        logDebug("Template instance cache hit", { cacheKey });
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
          return JSON.parse(cached) as TemplateInstanceLookupResult;
        }
      }
    }
  } catch (error) {
    logError("Redis cache error for template instance", error as Error);
    // キャッシュエラー時はフォールスルー（DB直接アクセス）
  }

  // DBから取得
  const result = await getTemplateInstanceFromDB(instanceId);

  // キャッシュに保存（5分）
  try {
    const redis = await getRedisClient();
    if (redis) {
      if (result === null) {
        if (ENABLE_NEGATIVE_CACHE) {
          await redis.setEx(cacheKey, CACHE_TTL_SECONDS, "null");
        }
      } else {
        await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
      }
    }
  } catch (error) {
    logError("Redis cache save error for template instance", error as Error);
  }

  return result;
};

/**
 * DBから McpServerTemplateInstance を取得する内部関数
 */
const getTemplateInstanceFromDB = async (
  instanceId: string,
): Promise<TemplateInstanceLookupResult | null> => {
  try {
    const instance = await db.mcpServerTemplateInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        mcpServerId: true,
      },
    });

    if (!instance) {
      logWarn("McpServerTemplateInstance not found", { instanceId });
      return null;
    }

    return instance;
  } catch (error) {
    logError(
      "Failed to get McpServerTemplateInstance from DB",
      error as Error,
      { instanceId },
    );
    throw error;
  }
};

/**
 * McpServerTemplateInstance キャッシュを無効化
 *
 * インスタンス削除・更新時に呼び出す。
 */
export const invalidateTemplateInstanceCache = async (
  instanceId: string,
): Promise<void> => {
  const cacheKey = `template:instance:${instanceId}`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug(
        "Redis not available, skipping template instance cache invalidation",
      );
      return;
    }

    await redis.del(cacheKey);
    logDebug("Template instance cache invalidated", { instanceId });
  } catch (error) {
    logError("Failed to invalidate template instance cache", error as Error, {
      instanceId,
    });
  }
};
