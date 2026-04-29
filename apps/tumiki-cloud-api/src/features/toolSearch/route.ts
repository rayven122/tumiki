// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { Hono } from "hono";

import { jwtAuth } from "../../middleware/auth.js";
import { toolSearchRequestSchema } from "./schema.js";
import { searchTools } from "./service.js";

const toolSearchRoute = new Hono<{ Variables: { orgId: string } }>();

toolSearchRoute.post("/v1/tool-search", jwtAuth, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const parsed = toolSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const results = await searchTools(parsed.data);
  return c.json({ results });
});

export { toolSearchRoute };
