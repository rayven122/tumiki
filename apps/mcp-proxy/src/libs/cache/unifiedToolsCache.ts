/**
 * 統合MCPエンドポイント用ツールキャッシュ
 *
 * Redis TTL 5分（300秒）でツール一覧をキャッシュ
 * キー形式: `unified:tools:{unifiedId}`
 */

import { getRedisClient } from "./redis.js";
import { logDebug, logError } from "../logger/index.js";
import type {
  AggregatedTool,
  CachedUnifiedTools,
} from "../../services/unifiedMcp/types.js";

/** キャッシュのTTL（秒） */
const CACHE_TTL_SECONDS = 300;

/** キャッシュキーのプレフィックス */
const CACHE_KEY_PREFIX = "unified:tools:";

/**
 * キャッシュキーを生成
 */
const getCacheKey = (unifiedId: string): string =>
  `${CACHE_KEY_PREFIX}${unifiedId}`;

/**
 * 統合ツール一覧をキャッシュから取得
 */
export const getUnifiedToolsFromCache = async (
  unifiedId: string,
): Promise<AggregatedTool[] | null> => {
  const cacheKey = getCacheKey(unifiedId);

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, cache disabled");
      return null;
    }

    const cached = await redis.get(cacheKey);
    if (cached === null) {
      logDebug("Unified tools cache miss", { cacheKey });
      return null;
    }

    logDebug("Unified tools cache hit", { cacheKey });
    const parsed = JSON.parse(cached) as CachedUnifiedTools;
    return parsed.tools;
  } catch (error) {
    logError("Failed to get unified tools from cache", error as Error, {
      cacheKey,
    });
    return null;
  }
};

/**
 * 統合ツール一覧をキャッシュに保存
 */
export const setUnifiedToolsCache = async (
  unifiedId: string,
  tools: AggregatedTool[],
): Promise<void> => {
  const cacheKey = getCacheKey(unifiedId);

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, skipping cache save");
      return;
    }

    const cacheData: CachedUnifiedTools = {
      tools,
      cachedAt: new Date().toISOString(),
    };

    await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(cacheData));
    logDebug("Unified tools cached", {
      cacheKey,
      toolCount: tools.length,
      ttlSeconds: CACHE_TTL_SECONDS,
    });
  } catch (error) {
    logError("Failed to save unified tools to cache", error as Error, {
      cacheKey,
    });
    // キャッシュ保存失敗はエラーにしない
  }
};

/**
 * 統合ツールキャッシュを無効化
 */
export const invalidateUnifiedToolsCache = async (
  unifiedId: string,
): Promise<void> => {
  const cacheKey = getCacheKey(unifiedId);

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, skipping cache invalidation");
      return;
    }

    await redis.del(cacheKey);
    logDebug("Unified tools cache invalidated", { cacheKey });
  } catch (error) {
    logError("Failed to invalidate unified tools cache", error as Error, {
      cacheKey,
    });
  }
};
