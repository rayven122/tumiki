// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { describe, expect, test } from "vitest";

import { healthRoute } from "../route.js";

describe("GET /health（ヘルスチェック）", () => {
  test("status: ok を返す", async () => {
    const res = await healthRoute.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });
});
