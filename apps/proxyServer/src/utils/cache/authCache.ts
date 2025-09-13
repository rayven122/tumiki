import { LRUCache } from "lru-cache";
import { logger } from "../../libs/logger.js";
import type { ValidationResult } from "../../libs/validateApiKey.js";

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
  // 完全なデータをキャッシュするための追加フィールド
  fullData?: unknown; // 完全なUserMcpServerInstanceデータを保持
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
        return entry;
      }
      this.stats.misses++;
      return undefined;
    } catch (error) {
      this.stats.errors++;
      logger.error("AuthCache error getting entry", { error });
      return undefined;
    }
  }

  /**
   * キャッシュに認証情報を設定
   * ValidationResult型を受け取る
   */
  set(apiKey: string, validation: ValidationResult): void {
    try {
      const entry: AuthCacheEntry = {
        valid: validation.valid,
        userMcpServerInstanceId: validation.userMcpServerInstance?.id,
        organizationId: validation.userMcpServerInstance?.organizationId,
        error: validation.error,
        createdAt: Date.now(),
        hitCount: 0,
        fullData: validation.userMcpServerInstance, // 完全なデータを保持
      };
      this.cache.set(apiKey, entry);
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      logger.error("AuthCache error setting entry", { error });
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
      logger.error("AuthCache error deleting entry", { error });
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
      logger.error("AuthCache error clearing by instance ID", {
        error,
        instanceId,
      });
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
      logger.error("AuthCache error clearing by organization ID", {
        error,
        organizationId,
      });
    }
    return cleared;
  }

  /**
   * 全てのキャッシュをクリア
   */
  clear(): void {
    try {
      const sizeBeforeClear = this.cache.size;
      this.cache.clear();
      this.stats.deletes += sizeBeforeClear;
    } catch (error) {
      this.stats.errors++;
      logger.error("AuthCache error clearing cache", { error });
    }
  }
}

/**
 * シングルトンインスタンスを作成
 */
export const createAuthCache = (): AuthCache => {
  return new AuthCache();
};
