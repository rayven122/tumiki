/**
 * McpServer リポジトリ
 *
 * McpServer関連のDBクエリとRedisキャッシュを提供。
 * OAuth認証時にMcpServerからorganizationIdを取得するためのサービス。
 * Redis キャッシュで高速化（TTL: 5分）
 */

import { db, type PiiMaskingMode, type AuthType } from "@tumiki/db/server";
import { getRedisClient } from "../../cache/redis.js";
import { withCache } from "../../cache/withCache.js";
import { logDebug, logError, logWarn } from "../../../shared/logger/index.js";

/**
 * McpServer検索結果の型
 */
export type McpServerLookupResult = {
  id: string;
  organizationId: string;
  deletedAt: Date | null;
  authType: AuthType;
  /** PIIマスキングモード（GCP DLPによるマスキング） */
  piiMaskingMode: PiiMaskingMode;
  /** 使用するInfoType一覧（空配列 = 全InfoType使用） */
  piiInfoTypes: string[];
  /** TOON変換を有効にするかどうか（AIへのトークン削減用） */
  toonConversionEnabled: boolean;
};

/**
 * キャッシュ用のシリアライズ型（Date → string）
 */
type CachedMcpServerResult = {
  id: string;
  organizationId: string;
  deletedAt: string | null;
  authType: AuthType;
  piiMaskingMode: PiiMaskingMode;
  piiInfoTypes: string[];
  toonConversionEnabled: boolean;
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
  const cacheKey = `mcpserver:org:${mcpServerId}`;
  const redis = await getRedisClient();

  return withCache<McpServerLookupResult>({
    redis,
    cacheKey,
    ttlSeconds: CACHE_TTL_SECONDS,
    fetch: () => getMcpServerFromDB(mcpServerId),
    serialize: (result) =>
      JSON.stringify({
        id: result.id,
        organizationId: result.organizationId,
        deletedAt: result.deletedAt ? result.deletedAt.toISOString() : null,
        authType: result.authType,
        piiMaskingMode: result.piiMaskingMode,
        piiInfoTypes: result.piiInfoTypes,
        toonConversionEnabled: result.toonConversionEnabled,
      } satisfies CachedMcpServerResult),
    deserialize: (cached) => {
      const parsed = JSON.parse(cached) as CachedMcpServerResult;
      return {
        id: parsed.id,
        organizationId: parsed.organizationId,
        deletedAt: parsed.deletedAt ? new Date(parsed.deletedAt) : null,
        authType: parsed.authType,
        piiMaskingMode: parsed.piiMaskingMode,
        piiInfoTypes: parsed.piiInfoTypes,
        toonConversionEnabled: parsed.toonConversionEnabled,
      };
    },
    negativeCache: {
      enabled: ENABLE_NEGATIVE_CACHE,
      onBypass: () => {
        logDebug("Negative cache ignored due to DISABLE_NEGATIVE_CACHE");
      },
    },
    onHit: () => {
      logDebug("McpServer cache hit", { cacheKey });
    },
    onReadError: (error) => {
      logError("Redis cache error", error);
    },
    onWriteError: (error) => {
      logError("Redis cache save error", error);
    },
  });
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
        piiMaskingMode: true,
        piiInfoTypes: true,
        toonConversionEnabled: true,
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
  const redis = await getRedisClient();

  const cached = await withCache<boolean>({
    redis,
    cacheKey,
    ttlSeconds: CACHE_TTL_SECONDS,
    fetch: async () => {
      const member = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        select: { id: true },
      });

      return member !== null;
    },
    serialize: (isMember) => (isMember ? "true" : "false"),
    deserialize: (cached) => cached === "true",
    onHit: () => {
      logDebug("Organization membership cache hit", { cacheKey });
    },
    onReadError: (error) => {
      logError("Redis cache error for membership check", error);
    },
    onWriteError: (error) => {
      logError("Redis cache save error for membership", error);
    },
  });

  return cached ?? false;
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
  const cacheKey = `template:instance:${instanceId}`;
  const redis = await getRedisClient();

  return withCache<TemplateInstanceLookupResult>({
    redis,
    cacheKey,
    ttlSeconds: CACHE_TTL_SECONDS,
    fetch: () => getTemplateInstanceFromDB(instanceId),
    serialize: (result) => JSON.stringify(result),
    deserialize: (cached) => JSON.parse(cached) as TemplateInstanceLookupResult,
    negativeCache: {
      enabled: ENABLE_NEGATIVE_CACHE,
      onBypass: () => {
        logDebug("Negative cache ignored due to DISABLE_NEGATIVE_CACHE");
      },
    },
    onHit: () => {
      logDebug("Template instance cache hit", { cacheKey });
    },
    onReadError: (error) => {
      logError("Redis cache error for template instance", error);
    },
    onWriteError: (error) => {
      logError("Redis cache save error for template instance", error);
    },
  });
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

/**
 * slugとorganizationIdでMcpServerを取得
 *
 * パスパラメータがslugに変更されたため、slugからMcpServerを検索する。
 * 組織内でslugはユニークなので、organizationIdとslugの組み合わせで一意に特定可能。
 *
 * @param slug - MCP Server のslug
 * @param organizationId - 組織ID
 * @returns McpServer情報（見つからない場合はnull）
 */
export const getMcpServerBySlug = async (
  slug: string,
  organizationId: string,
): Promise<McpServerLookupResult | null> => {
  const cacheKey = `mcpserver:slug:${organizationId}:${slug}`;
  const redis = await getRedisClient();

  return withCache<McpServerLookupResult>({
    redis,
    cacheKey,
    ttlSeconds: CACHE_TTL_SECONDS,
    fetch: () => getMcpServerBySlugFromDB(slug, organizationId),
    serialize: (result) =>
      JSON.stringify({
        id: result.id,
        organizationId: result.organizationId,
        deletedAt: result.deletedAt ? result.deletedAt.toISOString() : null,
        authType: result.authType,
        piiMaskingMode: result.piiMaskingMode,
        piiInfoTypes: result.piiInfoTypes,
        toonConversionEnabled: result.toonConversionEnabled,
      } satisfies CachedMcpServerResult),
    deserialize: (cached) => {
      const parsed = JSON.parse(cached) as CachedMcpServerResult;
      return {
        id: parsed.id,
        organizationId: parsed.organizationId,
        deletedAt: parsed.deletedAt ? new Date(parsed.deletedAt) : null,
        authType: parsed.authType,
        piiMaskingMode: parsed.piiMaskingMode,
        piiInfoTypes: parsed.piiInfoTypes,
        toonConversionEnabled: parsed.toonConversionEnabled,
      };
    },
    negativeCache: {
      enabled: ENABLE_NEGATIVE_CACHE,
      onBypass: () => {
        logDebug("Negative cache ignored due to DISABLE_NEGATIVE_CACHE");
      },
    },
    onHit: () => {
      logDebug("McpServer slug cache hit", { cacheKey });
    },
    onReadError: (error) => {
      logError("Redis cache error for slug lookup", error);
    },
    onWriteError: (error) => {
      logError("Redis cache save error for slug lookup", error);
    },
  });
};

/**
 * DBからslugでMcpServerを取得する内部関数
 */
const getMcpServerBySlugFromDB = async (
  slug: string,
  organizationId: string,
): Promise<McpServerLookupResult | null> => {
  try {
    const mcpServer = await db.mcpServer.findUnique({
      where: {
        organizationId_slug: { organizationId, slug },
      },
      select: {
        id: true,
        organizationId: true,
        deletedAt: true,
        authType: true,
        piiMaskingMode: true,
        piiInfoTypes: true,
        toonConversionEnabled: true,
      },
    });

    if (!mcpServer) {
      logWarn("McpServer not found by slug", { slug, organizationId });
      return null;
    }

    return mcpServer;
  } catch (error) {
    logError("Failed to get McpServer by slug from DB", error as Error, {
      slug,
      organizationId,
    });
    throw error;
  }
};

/**
 * McpServer slugキャッシュを無効化
 *
 * McpServer削除・更新時に呼び出す。
 */
export const invalidateMcpServerSlugCache = async (
  slug: string,
  organizationId: string,
): Promise<void> => {
  const cacheKey = `mcpserver:slug:${organizationId}:${slug}`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, skipping slug cache invalidation");
      return;
    }

    await redis.del(cacheKey);
    logDebug("McpServer slug cache invalidated", { slug, organizationId });
  } catch (error) {
    logError("Failed to invalidate McpServer slug cache", error as Error, {
      slug,
      organizationId,
    });
  }
};
