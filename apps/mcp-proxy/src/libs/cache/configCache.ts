import type { RemoteMcpServerConfig } from "../../types/index.js";
import { logInfo } from "../logger/index.js";
// import { decrypt, encrypt } from "../crypto/index.js";
// import { getRedisClient } from "./redis.js";
// import { logError, sanitizeIdForLog } from "../logger/index.js";
// import { CACHE_CONFIG } from "../../constants/config.js";

/**
 * キャッシュされた設定データの型
 */
type CachedConfigData = Array<{
  namespace: string;
  config: RemoteMcpServerConfig;
}>;

/**
 * DBから設定を取得
 *
 * TODO: 将来的にRedisキャッシュを再実装する場合は、以下の点を考慮:
 * - Cloud Run のステートレス環境に適したキャッシュ戦略
 * - Redis接続の信頼性とフォールバック処理
 * - 暗号化/復号化のオーバーヘッド
 * - キャッシュ無効化のタイミングと整合性
 *
 * 現在: Redisキャッシュは本番環境では無効化されています
 * 常にDBから直接取得します
 */
export const getCachedConfig = async (
  mcpServerId: string,
  fetchFromDb: () => Promise<CachedConfigData>,
): Promise<CachedConfigData> => {
  logInfo("Fetching config from DB (cache disabled)", {
    mcpServerId,
  });
  return await fetchFromDb();

  // TODO: Redis キャッシュ実装（現在はコメントアウト）
  // 以下は元の実装です。必要に応じて復活させることができます。
  /*
  const cacheKey = getCacheKey(mcpServerId);
  const ttl = getCacheTtl();

  try {
    const redis = await getRedisClient();

    // Redisが利用できない場合はDBから直接取得
    if (!redis) {
      logInfo("Redis not available, fetching from DB", {
        mcpServerId,
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
          mcpServerId,
          serverCount: data.length,
        });
        return data;
      } catch {
        // セキュリティ: 元のエラーメッセージを隠蔽し、暗号化データの内容推測を防止
        logError(
          "Failed to decrypt cached config",
          new Error("Decryption failed"),
          {
            mcpServerId: sanitizeIdForLog(mcpServerId),
          },
        );
        // 復号化エラーの場合はキャッシュを削除してDBから取得
        await redis.del(cacheKey).catch(() => {
          // 削除エラーは無視
        });
      }
    }

    // キャッシュミス: DBから取得
    logInfo("Config cache miss", { mcpServerId });
    const data = await fetchFromDb();

    // キャッシュに保存（非同期、エラーは無視）
    // データを暗号化してから保存
    try {
      const encrypted = encrypt(JSON.stringify(data));
      redis
        .setEx(cacheKey, ttl, encrypted)
        .then(() => {
          logInfo("Config cached (encrypted)", {
            mcpServerId,
            serverCount: data.length,
            ttl,
          });
        })
        .catch((cacheError: Error) => {
          logError("Failed to cache config", cacheError, {
            mcpServerId,
          });
        });
    } catch (encryptError) {
      logError("Failed to encrypt config for caching", encryptError as Error, {
        mcpServerId,
      });
    }

    return data;
  } catch (error) {
    // Redis接続エラー等の場合はDBから直接取得
    logError("Cache operation failed, falling back to DB", error as Error, {
      mcpServerId,
    });
    return await fetchFromDb();
  }
  */
};

// TODO: Redis キャッシュ用のヘルパー関数（現在はコメントアウト）
/*
const getCacheTtl = (): number => {
  const ttl = process.env.CACHE_TTL;
  if (ttl) {
    const parsed = Number.parseInt(ttl, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return CACHE_CONFIG.DEFAULT_TTL_SECONDS;
};

const getCacheKey = (mcpServerId: string): string => {
  return `${CACHE_CONFIG.KEY_PREFIX.MCP_CONFIG}${mcpServerId}`;
};
*/

/**
 * キャッシュを無効化（設定変更時などに使用）
 *
 * TODO: Redisキャッシュ再実装時は以下のロジックを復活:
 * - Redis接続の取得
 * - キャッシュキーの削除
 * - エラーハンドリング
 *
 * 現在: Redisキャッシュは本番環境では無効化されているため、この関数は何もしません
 */
export const invalidateConfigCache = async (
  mcpServerId: string,
): Promise<void> => {
  logInfo("Cache invalidation skipped (cache disabled)", {
    mcpServerId,
  });

  // TODO: Redis キャッシュ無効化実装（現在はコメントアウト）
  /*
  const cacheKey = getCacheKey(mcpServerId);

  try {
    const redis = await getRedisClient();
    if (!redis) {
      return;
    }

    await redis.del(cacheKey);
    logInfo("Config cache invalidated", { mcpServerId });
  } catch (error) {
    logError("Failed to invalidate config cache", error as Error, {
      mcpServerId,
    });
  }
  */
};
