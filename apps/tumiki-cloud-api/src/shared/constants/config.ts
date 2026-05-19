// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

export const DEFAULT_PORT = 8080;

export const TIMEOUT_CONFIG = {
  llmRequest: 30_000,
} as const;

/**
 * ライセンスキーのプレフィックス
 * 認証ヘッダで送られる際は `tumiki_lic_<JWT>` の形式
 */
export const LICENSE_KEY_PREFIX = "tumiki_lic_";

/**
 * JWT 発行者
 */
export const LICENSE_JWT_ISSUER = "tumiki-license";

/**
 * JWT 受信者（このサービス自身）
 */
export const LICENSE_JWT_AUDIENCE = "tumiki-cloud-api";

export const DYNAMIC_SEARCH_CONFIG = {
  defaultModel: "anthropic/claude-3.5-haiku",
  maxToolsPerRequest: 500,
  defaultLimit: 10,
  maxLimit: 50,
} as const;

export const TOOL_SEARCH_EMBEDDING_CONFIG = {
  defaultModel: "text-embedding-3-small",
  maxTextsPerRequest: 512,
  maxTextLength: 1000,
  maxRequestBodySize: 200 * 1024,
  rateLimitWindowMs: 60 * 1000,
  cleanupIntervalMs: 5 * 60 * 1000,
  // Pod単位の上限。複数Pod環境では実効上限がPod数に比例するため、Ingress/Cloudflare側の制限と併用する。
  maxRequestsPerWindow: 120,
  maxRateLimitBuckets: 10_000,
} as const;
