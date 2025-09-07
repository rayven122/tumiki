import { LRUCache } from "lru-cache";

/**
 * キャッシュ統計情報
 */
export type CacheStats = {
  /** ヒット数 */
  hitCount: number;
  /** ミス数 */
  missCount: number;
  /** エントリー数 */
  entryCount: number;
  /** ヒット率 (0-1) */
  hitRate: number;
};

/**
 * キャッシュインスタンス
 */
export type CacheInstance<T extends object = Record<string, unknown>> = {
  /** 値を取得 */
  get: (key: string) => T | null;
  /** 値を設定 */
  set: (key: string, value: T) => void;
  /** 値を削除 */
  delete: (key: string) => boolean;
  /** キャッシュをクリア */
  clear: () => void;
  /** プレフィックスで無効化 */
  invalidatePrefix: (prefix: string) => void;
  /** 統計情報を取得 */
  getStats: () => CacheStats;
};

/**
 * 基本LRUキャッシュを作成
 *
 * lru-cacheライブラリをベースとした
 * シンプルなキャッシュインスタンスを生成します。
 *
 * @param config キャッシュ設定
 * @returns キャッシュインスタンス
 */
export const createLRUCache = <T extends object = Record<string, unknown>>(
  config: LRUCache.Options<string, T, unknown>,
): CacheInstance<T> => {
  // 統計カウンター
  let hitCount = 0;
  let missCount = 0;

  // LRUCacheインスタンスを作成
  const lru = new LRUCache<string, T>(config);

  const get = (key: string): T | null => {
    const value = lru.get(key);
    if (value !== undefined) {
      hitCount++;
      return value;
    }
    missCount++;
    return null;
  };

  const set = (key: string, value: T): void => {
    lru.set(key, value);
  };

  const deleteKey = (key: string): boolean => {
    return lru.delete(key);
  };

  const clear = (): void => {
    lru.clear();
    hitCount = 0;
    missCount = 0;
  };

  const invalidatePrefix = (prefix: string): void => {
    const keysToDelete: string[] = [];
    for (const [key] of lru.entries()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      lru.delete(key);
    }
  };

  const getStats = (): CacheStats => {
    const totalRequests = hitCount + missCount;
    const hitRate = totalRequests > 0 ? hitCount / totalRequests : 0;

    return {
      hitCount,
      missCount,
      entryCount: lru.size,
      hitRate,
    };
  };

  return {
    get,
    set,
    delete: deleteKey,
    clear,
    invalidatePrefix,
    getStats,
  };
};
