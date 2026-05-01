// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { serve } from "@hono/node-server";

import app from "./app.js";
import { DEFAULT_PORT } from "./shared/constants/config.js";

const port = Number(process.env.PORT) || DEFAULT_PORT;

// 必須環境変数の事前検証（本番のみ厳密チェック）
const isProduction = process.env.NODE_ENV === "production";
const requiredEnvVars = ["LICENSE_PUBLIC_KEY", "AI_GATEWAY_API_KEY"];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  if (isProduction) {
    console.error(
      `[tumiki-cloud-api] FATAL: Missing required env vars: ${missing.join(", ")}`,
    );
    process.exit(1);
  } else {
    console.warn(
      `[tumiki-cloud-api] WARNING: Missing env vars (development): ${missing.join(", ")}`,
    );
  }
}

// HTTP モードのみ（TLS は Cloudflare Tunnel で終端する）
serve({ fetch: app.fetch, port }, (info) => {
  console.log(
    `[tumiki-cloud-api] HTTP server running on http://localhost:${info.port}`,
  );
});
