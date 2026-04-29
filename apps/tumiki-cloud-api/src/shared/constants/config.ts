// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

export const DEFAULT_PORT = 8081;

export const TIMEOUT_CONFIG = {
  toolSearch: 30_000,
  certificateEnroll: 10_000,
} as const;

export const JWT_CONFIG = {
  defaultTtlSeconds: 3600,
  algorithm: "RS256",
} as const;

export const BOOTSTRAP_TOKEN_CONFIG = {
  prefix: "tumiki_",
  ttlHours: 72,
} as const;
