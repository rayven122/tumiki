// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { Hono } from "hono";

const healthRoute = new Hono();

healthRoute.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { healthRoute };
