// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

export const DEFAULT_PORT = 8081;

export const TIMEOUT_CONFIG = {
  certificateEnroll: 10_000,
} as const;

export const BOOTSTRAP_TOKEN_CONFIG = {
  prefix: "tumiki_",
  issuer: "rayven-cloud",
  audience: "tumiki-cloud-api",
} as const;
