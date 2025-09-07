import { LRUCache } from "lru-cache";
import crypto from "node:crypto";
import type { Tool } from "@tumiki/db";

export type CacheStats = {
  hitCount: number;
  missCount: number;
  entryCount: number;
  memoryUsage: number;
  hitRate: number;
};

export type ToolsCacheEntry = {
  tools: Tool[];
  timestamp: number;
  serverConfigHash: string;
};

export type ServerConfig = {
  name: string;
  toolNames?: string[];
};

export class ToolsCache {
  private cache: LRUCache<string, ToolsCacheEntry>;
  private hitCount = 0;
  private missCount = 0;
  private readonly maxSize = 50;
  private readonly ttl = 5 * 60 * 1000; // 5分TTL
  private readonly maxMemoryBytes = 50 * 1024 * 1024; // 50MB制限

  constructor() {
    this.cache = new LRUCache<string, ToolsCacheEntry>({
      max: this.maxSize,
      ttl: this.ttl,
      maxSize: this.maxMemoryBytes,
      sizeCalculation: (entry: ToolsCacheEntry) => {
        return (
          JSON.stringify(entry.tools).length +
          JSON.stringify(entry.serverConfigHash).length +
          8
        ); // timestampのサイズ
      },
      allowStale: false,
    });
  }

  set(key: string, tools: Tool[], serverConfigHash: string): void {
    const entry: ToolsCacheEntry = {
      tools,
      timestamp: Date.now(),
      serverConfigHash,
    };
    this.cache.set(key, entry);
  }

  get(key: string): Tool[] | null {
    const entry = this.cache.get(key);

    if (entry) {
      this.hitCount++;
      return entry.tools;
    }

    this.missCount++;
    return null;
  }

  invalidate(userMcpServerInstanceId: string): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache.entries()) {
      if (key.includes(userMcpServerInstanceId)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    let memoryUsage = 0;
    for (const [, entry] of this.cache.entries()) {
      memoryUsage +=
        JSON.stringify(entry.tools).length +
        JSON.stringify(entry.serverConfigHash).length +
        8; // timestampのサイズ
    }

    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      entryCount: this.cache.size,
      memoryUsage,
      hitRate,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

export const generateCacheKey = (
  userMcpServerInstanceId: string,
  serverConfigHash: string,
): string => {
  return `tools:${userMcpServerInstanceId}:${serverConfigHash}`;
};

export const generateServerConfigHash = (
  serverConfigs: ServerConfig[],
): string => {
  const configString = JSON.stringify(
    serverConfigs.map((config) => ({
      name: config.name,
      toolNames: config.toolNames,
      // 環境変数は除外（セキュリティ考慮）
    })),
  );
  return crypto.createHash("md5").update(configString).digest("hex");
};

// シングルトンインスタンス
let toolsCacheInstance: ToolsCache | null = null;

export const getToolsCacheInstance = (): ToolsCache => {
  if (!toolsCacheInstance) {
    toolsCacheInstance = new ToolsCache();
  }
  return toolsCacheInstance;
};
