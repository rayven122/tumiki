import { LRUCache } from "lru-cache";

/**
 * 認証キャッシュのエントリー型
 */
export type AuthCacheEntry = {
  valid: boolean;
  userMcpServerInstanceId?: string;
  organizationId?: string;
  error?: string;
  // 追加のメタデータ
  createdAt: number;
  hitCount: number;
};

/**
 * 認証キャッシュのドメイン定義
 */
export const authCacheDomain = {
  /**
   * キャッシュキーの生成
   * APIキーをそのままキーとして使用
   */
  keyFn: (apiKey: string) => apiKey,

  /**
   * TTL設定（ミリ秒）
   * 認証情報は5分間キャッシュ
   */
  ttl: 5 * 60 * 1000,

  /**
   * 最大エントリー数
   * 同時に使用されるAPIキーは通常少ないため、小さめの値を設定
   */
  maxSize: 100,
} as const;

/**
 * 認証キャッシュクラス
 * APIキーの検証結果をLRUキャッシュで管理
 */
export class AuthCache {
  private cache: LRUCache<string, AuthCacheEntry>;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor() {
    this.cache = new LRUCache<string, AuthCacheEntry>({
      max: authCacheDomain.maxSize,
      ttl: authCacheDomain.ttl,
    });
  }

  /**
   * キャッシュから認証情報を取得
   */
  get(apiKey: string): AuthCacheEntry | undefined {
    try {
      const entry = this.cache.get(apiKey);
      if (entry) {
        this.stats.hits++;
        // ヒットカウントを増やす
        const updatedEntry = {
          ...entry,
          hitCount: entry.hitCount + 1,
        };
        this.cache.set(apiKey, updatedEntry);
        return updatedEntry;
      }
      this.stats.misses++;
      return undefined;
    } catch (error) {
      this.stats.errors++;
      console.error("[AuthCache] Error getting entry:", error);
      return undefined;
    }
  }

  /**
   * キャッシュに認証情報を設定
   */
  set(
    apiKey: string,
    validation: {
      valid: boolean;
      userMcpServerInstance?: { id: string; organizationId: string };
      error?: string;
    },
  ): void {
    try {
      const entry: AuthCacheEntry = {
        valid: validation.valid,
        userMcpServerInstanceId: validation.userMcpServerInstance?.id,
        organizationId: validation.userMcpServerInstance?.organizationId,
        error: validation.error,
        createdAt: Date.now(),
        hitCount: 0,
      };
      this.cache.set(apiKey, entry);
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error("[AuthCache] Error setting entry:", error);
    }
  }

  /**
   * 特定のAPIキーのキャッシュを削除
   */
  delete(apiKey: string): boolean {
    try {
      const result = this.cache.delete(apiKey);
      if (result) {
        this.stats.deletes++;
      }
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error("[AuthCache] Error deleting entry:", error);
      return false;
    }
  }

  /**
   * 特定のインスタンスIDに関連する全てのキャッシュをクリア
   */
  clearByInstanceId(instanceId: string): number {
    let cleared = 0;
    try {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.userMcpServerInstanceId === instanceId) {
          if (this.cache.delete(key)) {
            cleared++;
            this.stats.deletes++;
          }
        }
      }
    } catch (error) {
      this.stats.errors++;
      console.error("[AuthCache] Error clearing by instance ID:", error);
    }
    return cleared;
  }

  /**
   * 特定の組織IDに関連する全てのキャッシュをクリア
   */
  clearByOrganizationId(organizationId: string): number {
    let cleared = 0;
    try {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.organizationId === organizationId) {
          if (this.cache.delete(key)) {
            cleared++;
            this.stats.deletes++;
          }
        }
      }
    } catch (error) {
      this.stats.errors++;
      console.error("[AuthCache] Error clearing by organization ID:", error);
    }
    return cleared;
  }

  /**
   * 全てのキャッシュをクリア
   */
  clear(): void {
    try {
      this.cache.clear();
      this.stats.deletes += this.cache.size;
    } catch (error) {
      this.stats.errors++;
      console.error("[AuthCache] Error clearing cache:", error);
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate:
        this.stats.hits + this.stats.misses > 0
          ? this.stats.hits / (this.stats.hits + this.stats.misses)
          : 0,
    };
  }

  /**
   * キャッシュ情報を取得（デバッグ用）
   */
  getInfo() {
    const entries: Array<{
      apiKey: string;
      valid: boolean;
      instanceId?: string;
      organizationId?: string;
      age: number;
      hitCount: number;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        apiKey: key.substring(0, 10) + "...", // セキュリティのため一部のみ表示
        valid: entry.valid,
        instanceId: entry.userMcpServerInstanceId,
        organizationId: entry.organizationId,
        age: Date.now() - entry.createdAt,
        hitCount: entry.hitCount,
      });
    }

    return {
      stats: this.getStats(),
      entries,
    };
  }
}

/**
 * シングルトンインスタンスを作成
 */
export const createAuthCache = (): AuthCache => {
  return new AuthCache();
};