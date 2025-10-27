/**
 * レート制限ミドルウェア (Hono用)
 *
 * hono-rate-limiterを使用して、組織/APIキーごとにレート制限を適用します。
 */

import { rateLimiter } from "hono-rate-limiter";
import type { Context } from "hono";
import type { HonoEnv } from "../types/hono.js";
import { getRedisClient } from "../libs/redis.js";

export type RateLimitConfig = {
  windowMs: number;
  limit: number;
  standardHeaders: boolean;
  keyGenerator?: (c: Context) => string;
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分
  limit: 60, // 1分あたり60リクエスト
  standardHeaders: true,
};

export const ORGANIZATION_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  limit: 1000, // 1分あたり1000リクエスト
  standardHeaders: true,
};

/**
 * APIキーごとのレート制限ミドルウェア
 */
export const createApiKeyRateLimiter = () => {
  return rateLimiter<HonoEnv>({
    windowMs: DEFAULT_RATE_LIMIT_CONFIG.windowMs,
    limit: DEFAULT_RATE_LIMIT_CONFIG.limit,
    standardHeaders: "draft-7",
    keyGenerator: (c) => {
      // 認証情報からキーを生成
      const authInfo = c.get("authInfo");
      if (authInfo) {
        return authInfo.apiKeyId || authInfo.organizationId || "anonymous";
      }
      // 認証前の場合はIPアドレスを使用（通常は到達しない）
      return (
        c.req.header("x-forwarded-for") ||
        c.req.header("x-real-ip") ||
        "unknown"
      );
    },
    // Redisストアの設定は後で拡張可能
  });
};

/**
 * 組織ごとのレート制限ミドルウェア
 */
export const createOrganizationRateLimiter = () => {
  return rateLimiter<HonoEnv>({
    windowMs: ORGANIZATION_RATE_LIMIT_CONFIG.windowMs,
    limit: ORGANIZATION_RATE_LIMIT_CONFIG.limit,
    standardHeaders: "draft-7",
    keyGenerator: (c) => {
      const authInfo = c.get("authInfo");
      return authInfo?.organizationId || "anonymous";
    },
  });
};

/**
 * ヘルスチェックをスキップする関数
 */
export const shouldSkipRateLimit = (c: Context): boolean => {
  const path = new URL(c.req.url).pathname;
  return path === "/health" || path === "/" || path.includes("/.well-known/");
};
