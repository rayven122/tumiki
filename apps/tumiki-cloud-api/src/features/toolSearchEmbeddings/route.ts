// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * POST /v1/tool-search/embeddings
 *
 * Desktop の動的ツール検索向けに、認証済み Tumiki ユーザーの text embedding だけを生成する。
 * ランキングとツール embedding cache は Desktop 側で保持する。
 */

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { MiddlewareHandler } from "hono";

import { TOOL_SEARCH_EMBEDDING_CONFIG } from "../../shared/constants/config.js";
import {
  verifyTumikiJwtMiddleware,
  type TumikiJwtContextVariables,
} from "../../shared/middleware/verifyTumikiJwt.js";
import { toolSearchEmbeddingsRequestSchema } from "./schema.js";
import { embedToolSearchTexts, GatewayNotConfiguredError } from "./service.js";

const toolSearchEmbeddingsRoute = new Hono<{
  Variables: TumikiJwtContextVariables;
}>();

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

// Podごとの軽い防御。複数Pod環境ではIngress/Cloudflare側の制限と組み合わせる。
const deleteExpiredRateLimitBuckets = (now: number): void => {
  for (const [subject, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(subject);
    }
  }
};

const rateLimitCleanupInterval = setInterval(
  () => deleteExpiredRateLimitBuckets(Date.now()),
  Math.max(TOOL_SEARCH_EMBEDDING_CONFIG.rateLimitWindowMs, 5 * 60 * 1000),
);
if (
  typeof rateLimitCleanupInterval === "object" &&
  "unref" in rateLimitCleanupInterval
) {
  rateLimitCleanupInterval.unref();
}

const verifyRateLimit = (): MiddlewareHandler<{
  Variables: TumikiJwtContextVariables;
}> => {
  return async (c, next) => {
    const now = Date.now();
    const subject = c.var.tumikiJwt.sub;
    const current = rateLimitBuckets.get(subject);
    const windowMs = TOOL_SEARCH_EMBEDDING_CONFIG.rateLimitWindowMs;
    const currentIsActive = current !== undefined && current.resetAt > now;

    if (
      !currentIsActive &&
      rateLimitBuckets.size >= TOOL_SEARCH_EMBEDDING_CONFIG.maxRateLimitBuckets
    ) {
      deleteExpiredRateLimitBuckets(now);
      if (
        rateLimitBuckets.size >=
        TOOL_SEARCH_EMBEDDING_CONFIG.maxRateLimitBuckets
      ) {
        return c.json({ error: "Too Many Requests" }, 429, {
          "Retry-After": String(Math.ceil(windowMs / 1000)),
        });
      }
    }

    const bucket = currentIsActive
      ? current
      : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    rateLimitBuckets.set(subject, bucket);

    if (bucket.count > TOOL_SEARCH_EMBEDDING_CONFIG.maxRequestsPerWindow) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
      return c.json({ error: "Too Many Requests" }, 429, {
        "Retry-After": String(retryAfterSec),
      });
    }

    await next();
  };
};

/** @internal テスト専用 */
export const resetToolSearchEmbeddingsRateLimit = (): void => {
  rateLimitBuckets.clear();
};

/** @internal テスト専用 */
export const stopToolSearchEmbeddingsRateLimitCleanup = (): void => {
  clearInterval(rateLimitCleanupInterval);
};

toolSearchEmbeddingsRoute.use(
  "/v1/tool-search/*",
  bodyLimit({ maxSize: TOOL_SEARCH_EMBEDDING_CONFIG.maxRequestBodySize }),
);
toolSearchEmbeddingsRoute.use("/v1/tool-search/*", verifyTumikiJwtMiddleware());
toolSearchEmbeddingsRoute.use("/v1/tool-search/*", verifyRateLimit());

toolSearchEmbeddingsRoute.post("/v1/tool-search/embeddings", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch (err) {
    console.warn("[tool-search/embeddings] Failed to parse request body:", err);
    return c.json({ error: "Invalid request body" }, 400);
  }

  const parsed = toolSearchEmbeddingsRequestSchema.safeParse(body);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      return c.json(
        { error: "Invalid request body", details: parsed.error.issues },
        400,
      );
    }
    return c.json({ error: "Invalid request body" }, 400);
  }

  try {
    const result = await embedToolSearchTexts(parsed.data);
    console.log(
      `[tool-search/embeddings] texts=${parsed.data.texts.length} model=${result.model}`,
    );
    return c.json(result);
  } catch (err) {
    if (err instanceof GatewayNotConfiguredError) {
      console.error("[tool-search/embeddings] Server misconfiguration:", err);
      return c.json({ error: "Server misconfiguration" }, 500);
    }

    console.error("[tool-search/embeddings] Embedding failed:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export { toolSearchEmbeddingsRoute };
