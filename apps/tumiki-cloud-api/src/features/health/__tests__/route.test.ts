// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { describe, expect, test } from "vitest";
import { healthRoute } from "../route.js";

describe("GET /health", () => {
  test("status ok と timestamp を返す", async () => {
    const req = new Request("http://localhost/health");
    const res = await healthRoute.fetch(req);

    expect(res.status).toStrictEqual(200);
    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toStrictEqual("ok");
    expect(typeof body.timestamp).toStrictEqual("string");
    expect(new Date(body.timestamp).toString()).not.toStrictEqual(
      "Invalid Date",
    );
  });
});
