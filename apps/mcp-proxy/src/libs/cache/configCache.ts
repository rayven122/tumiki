import type { RemoteMcpServerConfig } from "../../server/config.js";
import { getRedisClient } from "./redis.js";
import { logError, logInfo } from "../logger/index.js";

/**
 * キャッシュされた設定データの型
 */
type CachedConfigData = Array<{
  namespace: string;
  config: RemoteMcpServerConfig;
}>;

/**
 * キャッシュTTL（秒単位、環境変数でカスタマイズ可能）
 * デフォルト: 300秒（5分）
 */
const getCacheTtl = (): number => {
  const ttl = process.env.CACHE_TTL;
  if (ttl) {
    const parsed = Number.parseInt(ttl, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 300; // デフォルト5分
};

/**
 * キャッシュキーの生成
 */
const getCacheKey = (userMcpServerInstanceId: string): string => {
  return `mcp:config:${userMcpServerInstanceId}`;
};

/**
 * キャッシュから設定を取得、キャッシュミス時はDBから取得してキャッシュに保存
 */
export const getCachedConfig = async (
  userMcpServerInstanceId: string,
  fetchFromDb: () => Promise<CachedConfigData>,
): Promise<CachedConfigData> => {
  const cacheKey = getCacheKey(userMcpServerInstanceId);
  const ttl = getCacheTtl();

  try {
    const redis = await getRedisClient();

    // Redisが利用できない場合はDBから直接取得
    if (!redis) {
      logInfo("Redis not available, fetching from DB", {
        userMcpServerInstanceId,
      });
      return await fetchFromDb();
    }

    // キャッシュを確認
    const cached = await redis.get(cacheKey);

    if (cached) {
      // キャッシュヒット
      try {
        const data = JSON.parse(cached) as CachedConfigData;
        logInfo("Config cache hit", {
          userMcpServerInstanceId,
          serverCount: data.length,
        });
        return data;
      } catch (parseError) {
        logError("Failed to parse cached config", parseError as Error, {
          userMcpServerInstanceId,
        });
        // パースエラーの場合はキャッシュを削除してDBから取得
        await redis.del(cacheKey).catch(() => {
          // 削除エラーは無視
        });
      }
    }

    // キャッシュミス: DBから取得
    logInfo("Config cache miss", { userMcpServerInstanceId });
    const data = await fetchFromDb();

    // キャッシュに保存（非同期、エラーは無視）
    redis
      .setEx(cacheKey, ttl, JSON.stringify(data))
      .then(() => {
        logInfo("Config cached", {
          userMcpServerInstanceId,
          serverCount: data.length,
          ttl,
        });
      })
      .catch((cacheError: Error) => {
        logError("Failed to cache config", cacheError, {
          userMcpServerInstanceId,
        });
      });

    return data;
  } catch (error) {
    // Redis接続エラー等の場合はDBから直接取得
    logError("Cache operation failed, falling back to DB", error as Error, {
      userMcpServerInstanceId,
    });
    return await fetchFromDb();
  }
};

/**
 * キャッシュを無効化（設定変更時などに使用）
 */
export const invalidateConfigCache = async (
  userMcpServerInstanceId: string,
): Promise<void> => {
  const cacheKey = getCacheKey(userMcpServerInstanceId);

  try {
    const redis = await getRedisClient();
    if (!redis) {
      return;
    }

    await redis.del(cacheKey);
    logInfo("Config cache invalidated", { userMcpServerInstanceId });
  } catch (error) {
    logError("Failed to invalidate config cache", error as Error, {
      userMcpServerInstanceId,
    });
  }
};
