import type { RemoteMcpServerConfig } from "../../server/config.js";
import { decrypt, encrypt } from "../crypto/index.js";
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
        // 暗号化されたデータを復号化
        const decrypted = decrypt(cached);
        const data = JSON.parse(decrypted) as CachedConfigData;
        logInfo("Config cache hit", {
          userMcpServerInstanceId,
          serverCount: data.length,
        });
        return data;
      } catch (decryptError) {
        logError(
          "Failed to decrypt or parse cached config",
          decryptError as Error,
          {
            userMcpServerInstanceId,
          },
        );
        // 復号化エラーの場合はキャッシュを削除してDBから取得
        await redis.del(cacheKey).catch(() => {
          // 削除エラーは無視
        });
      }
    }

    // キャッシュミス: DBから取得
    logInfo("Config cache miss", { userMcpServerInstanceId });
    const data = await fetchFromDb();

    // キャッシュに保存（非同期、エラーは無視）
    // データを暗号化してから保存
    try {
      const encrypted = encrypt(JSON.stringify(data));
      redis
        .setEx(cacheKey, ttl, encrypted)
        .then(() => {
          logInfo("Config cached (encrypted)", {
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
    } catch (encryptError) {
      logError("Failed to encrypt config for caching", encryptError as Error, {
        userMcpServerInstanceId,
      });
    }

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
