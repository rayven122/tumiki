/**
 * @fileoverview ドメイン固有キャッシュファクトリー
 *
 * 特定の用途（tools/list、認証、セッション等）に最適化された
 * シンプルなキャッシュファクトリー関数群です。
 */

import crypto from "node:crypto";
import type { Tool } from "@tumiki/db";
import { createLRUCache } from "./core.js";

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
 * サーバー設定の型定義
 */
export type ServerConfig = {
  /** サーバー名 */
  name: string;
  /** ツール名一覧（オプション） */
  toolNames?: string[];
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
      const data = serverConfigs.map((config) => ({
        name: config.name,
        toolNames: config.toolNames,
      }));
      return crypto
        .createHash("sha256")
        .update(JSON.stringify(data, Object.keys(data).sort()))
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
    max: 500,
    ttl: 30 * 60 * 1000, // 30分
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
