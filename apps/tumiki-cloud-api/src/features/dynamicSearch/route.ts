// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * POST /v1/dynamic-search/search
 *
 * desktop / internal-manager から呼び出される動的ツール検索エンドポイント。
 * ライセンス JWT で認証し、Vercel AI Gateway 経由で LLM を呼び出す。
 */

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { MiddlewareHandler } from "hono";

import { LICENSE_KEY_PREFIX } from "../../shared/constants/config.js";
import {
  verifyLicenseKey,
  type LicenseContextVariables,
} from "../../shared/middleware/verifyLicense.js";
import { searchRequestSchema } from "./schema.js";
import { searchTools } from "./service.js";

type DynamicSearchVariables = LicenseContextVariables;

const dynamicSearchRoute = new Hono<{ Variables: DynamicSearchVariables }>();

const verifyDynamicSearchAuth = (): MiddlewareHandler<{
  Variables: DynamicSearchVariables;
}> => {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const bearerToken = authHeader.slice(7);

    if (bearerToken.startsWith(LICENSE_KEY_PREFIX)) {
      const publicKeyPem = process.env.LICENSE_PUBLIC_KEY;
      if (!publicKeyPem) {
        console.error(
          "[dynamic-search/auth] LICENSE_PUBLIC_KEY env var is not configured",
        );
        return c.json({ error: "Server misconfiguration" }, 500);
      }

      const license = await verifyLicenseKey(bearerToken, publicKeyPem);
      if (!license) {
        return c.json({ error: "Invalid or expired license" }, 401);
      }
      if (!license.features.includes("dynamic-search")) {
        return c.json(
          { error: "License does not include feature: dynamic-search" },
          403,
        );
      }

      c.set("license", license);
      await next();
      return;
    }

    return c.json({ error: "Invalid or expired license" }, 401);
  };
};

// ツールリストが大きくなる可能性があるため 200KB に制限
dynamicSearchRoute.use(
  "/v1/dynamic-search/*",
  bodyLimit({ maxSize: 200 * 1024 }),
);

dynamicSearchRoute.use("/v1/dynamic-search/*", verifyDynamicSearchAuth());

dynamicSearchRoute.post("/v1/dynamic-search/search", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch (err) {
    console.warn("[dynamic-search/search] Failed to parse request body:", err);
    return c.json({ error: "Invalid request body" }, 400);
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    // 本番ではスキーマ詳細の漏洩を防ぐため details を返さない
    if (process.env.NODE_ENV !== "production") {
      return c.json(
        { error: "Invalid request body", details: parsed.error.issues },
        400,
      );
    }
    return c.json({ error: "Invalid request body" }, 400);
  }

  try {
    const result = await searchTools(parsed.data);
    console.log(
      `[dynamic-search/search] sub=${c.var.license.sub} tools=${parsed.data.tools.length} results=${result.results.length}`,
    );
    return c.json(result);
  } catch (err) {
    console.error("[dynamic-search/search] Search failed:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export { dynamicSearchRoute };
