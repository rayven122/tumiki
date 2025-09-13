/**
 * @fileoverview ドメイン固有キャッシュファクトリー
 *
 * 特定の用途（tools/list、認証、セッション等）に最適化された
 * シンプルなキャッシュファクトリー関数群です。
 */

import crypto from "node:crypto";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "../../libs/types.js";
import { createLRUCache } from "./core.js";

export type { ServerConfig, Tool };

/**
 * tools/list専用キャッシュエントリ
 */
export type ToolsCacheEntry = {
  /** キャッシュされたツール一覧 */
  tools: Tool[];
  /** サーバー設定のハッシュ値 */
  serverConfigHash: string;
};

/**
 * tools/list専用キャッシュを作成
 */
export const createToolsCache = () => {
  const baseCache = createLRUCache<ToolsCacheEntry>({
    max: 50,
    ttl: 5 * 60 * 1000, // 5分
  });

  return {
    ...baseCache,
    setTools: (key: string, tools: Tool[], serverConfigHash: string): void => {
      baseCache.set(key, { tools, serverConfigHash });
    },
    getTools: (key: string): Tool[] | null => {
      const entry = baseCache.get(key);
      return entry ? entry.tools : null;
    },
    invalidateServer: (userMcpServerInstanceId: string): void => {
      baseCache.invalidatePrefix(`tools:${userMcpServerInstanceId}:`);
    },
    generateKey: (
      userMcpServerInstanceId: string,
      serverConfigHash: string,
    ): string => {
      return `tools:${userMcpServerInstanceId}:${serverConfigHash}`;
    },
    generateServerConfigHash: (serverConfigs: ServerConfig[]): string => {
      const essentialData = serverConfigs
        .map((config) => ({
          name: config.name,
          toolNames: [...config.toolNames].sort(), // tools/listの結果そのもの
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return crypto
        .createHash("sha256")
        .update(JSON.stringify(essentialData))
        .digest("hex");
    },
  };
};

/**
 * 認証トークン用キャッシュを作成
 */
export const createAuthCache = <T extends object = { value: string }>() => {
  const baseCache = createLRUCache<T>({
    max: 200,
    ttl: 15 * 60 * 1000, // 15分
  });

  return {
    ...baseCache,
    invalidateUser: (userId: string): void => {
      baseCache.invalidatePrefix(`auth:user:${userId}:`);
    },
    generateUserKey: (userId: string, tokenType: string): string => {
      return `auth:user:${userId}:${tokenType}`;
    },
  };
};

/**
 * セッション管理用キャッシュを作成
 */
export const createSessionCache = <
  T extends object = Record<string, unknown>,
>() => {
  const baseCache = createLRUCache<T>({
    max: 100,
    ttl: 5 * 60 * 1000, // 5分
  });

  return {
    ...baseCache,
    generateSessionKey: (sessionId: string): string => {
      return `session:${sessionId}`;
    },
    invalidateUserSessions: (userId: string): void => {
      baseCache.invalidatePrefix(`session:user:${userId}:`);
    },
  };
};

/**
 * 汎用データキャッシュを作成
 */
export const createDataCache = <T extends object = Record<string, unknown>>(
  namespace: string,
) => {
  const baseCache = createLRUCache<T>({
    max: 100, // 現実的なサーバーインスタンス数に調整
    ttl: 10 * 60 * 1000, // 10分（設定更新頻度を考慮）
  });

  return {
    ...baseCache,
    generateKey: (...parts: string[]): string => {
      return `${namespace}:${parts.join(":")}`;
    },
    invalidateNamespace: (subNamespace: string): void => {
      baseCache.invalidatePrefix(`${namespace}:${subNamespace}:`);
    },
  };
};
