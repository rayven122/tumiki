import { toError } from "../../shared/errors/toError.js";

type RedisLike = {
  get: (key: string) => Promise<string | null>;
  setEx: (key: string, ttlSeconds: number, value: string) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
};

type NegativeCacheOptions = {
  enabled: boolean;
  sentinel?: string;
  /**
   * ネガティブキャッシュが無効な場合、既存の "null" キャッシュを削除する。
   * デフォルトは true。
   */
  deleteOnDisabled?: boolean;
  /**
   * ネガティブキャッシュを無視した際のフック（ログ用途）。
   */
  onBypass?: () => void;
};

export type WithCacheOptions<T> = {
  redis: RedisLike | null;
  cacheKey: string;
  ttlSeconds: number;
  fetch: () => Promise<T | null>;
  serialize: (value: T) => string;
  deserialize: (raw: string) => T;
  negativeCache?: NegativeCacheOptions;
  onHit?: () => void;
  onReadError: (error: Error) => void;
  onWriteError: (error: Error) => void;
};

/**
 * 汎用 read-through cache ユーティリティ。
 *
 * - Redis 読み取り失敗時は DB フォールバック
 * - DB 取得後の Redis 書き込み失敗は握りつぶして結果を返す
 * - ネガティブキャッシュ（"null" sentinel）をオプションで扱う
 */
export const withCache = async <T>(
  options: WithCacheOptions<T>,
): Promise<T | null> => {
  const {
    redis,
    cacheKey,
    ttlSeconds,
    fetch,
    serialize,
    deserialize,
    onHit,
    onReadError,
    onWriteError,
  } = options;

  const negativeCache = options.negativeCache ?? { enabled: false };
  const sentinel = negativeCache.sentinel ?? "null";
  const shouldDeleteOnDisabled = negativeCache.deleteOnDisabled !== false;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        onHit?.();

        if (cached === sentinel) {
          if (negativeCache.enabled) {
            return null;
          }

          negativeCache.onBypass?.();
          if (shouldDeleteOnDisabled) {
            await redis.del(cacheKey);
          }
          // ネガティブキャッシュ無効時はDB取得へフォールスルー
        } else {
          try {
            return deserialize(cached);
          } catch (error) {
            onReadError(toError(error));
            // パース失敗時はDB取得へフォールスルー
          }
        }
      }
    } catch (error) {
      onReadError(toError(error));
      // Redis 読み取り失敗時はDB取得へフォールスルー
    }
  }

  const result = await fetch();

  if (redis) {
    try {
      if (result === null) {
        if (negativeCache.enabled) {
          await redis.setEx(cacheKey, ttlSeconds, sentinel);
        }
      } else {
        await redis.setEx(cacheKey, ttlSeconds, serialize(result));
      }
    } catch (error) {
      onWriteError(toError(error));
    }
  }

  return result;
};
