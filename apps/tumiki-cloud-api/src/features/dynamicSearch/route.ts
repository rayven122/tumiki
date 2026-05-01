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

import {
  verifyLicenseMiddleware,
  type LicenseContextVariables,
} from "../../shared/middleware/verifyLicense.js";
import { searchRequestSchema } from "./schema.js";
import { searchTools } from "./service.js";

const dynamicSearchRoute = new Hono<{ Variables: LicenseContextVariables }>();

// ツールリストが大きくなる可能性があるため 200KB に制限
dynamicSearchRoute.use(
  "/v1/dynamic-search/*",
  bodyLimit({ maxSize: 200 * 1024 }),
);

dynamicSearchRoute.use(
  "/v1/dynamic-search/*",
  verifyLicenseMiddleware("dynamic-search"),
);

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
    return c.json(
      { error: "Invalid request body", details: parsed.error.issues },
      400,
    );
  }

  const license = c.var.license;

  try {
    const result = await searchTools(parsed.data);
    console.log(
      `[dynamic-search/search] sub=${license.sub} type=${license.type} tools=${parsed.data.tools.length} results=${result.results.length}`,
    );
    return c.json(result);
  } catch (err) {
    console.error("[dynamic-search/search] Search failed:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export { dynamicSearchRoute };
