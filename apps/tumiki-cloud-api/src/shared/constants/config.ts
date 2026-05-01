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
