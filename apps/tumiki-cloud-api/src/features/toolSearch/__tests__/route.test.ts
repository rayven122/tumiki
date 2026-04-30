// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../middleware/auth.js", () => ({
  jwtAuth: vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
}));

vi.mock("../service.js", () => ({
  searchTools: vi.fn(),
}));

import { searchTools } from "../service.js";
import { toolSearchRoute } from "../route.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /v1/tool-search", () => {
  test("不正な JSON ボディで 400 を返す", async () => {
    const res = await toolSearchRoute.request("/v1/tool-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{{{",
    });
    expect(res.status).toStrictEqual(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Invalid request body");
  });

  test("Zod バリデーション失敗（query が空文字）で 400 を返す", async () => {
    const res = await toolSearchRoute.request("/v1/tool-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "", tools: [], limit: 10 }),
    });
    expect(res.status).toStrictEqual(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Invalid request body");
  });

  test("searchTools が正常に結果を返す場合に 200 と results を返す", async () => {
    const mockResults = [
      { toolName: "read_file", relevanceScore: 0.95 },
      { toolName: "write_file", relevanceScore: 0.7 },
    ];
    vi.mocked(searchTools).mockResolvedValue(mockResults);

    const res = await toolSearchRoute.request("/v1/tool-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "ファイルを読む",
        tools: [
          { name: "read_file", description: "ファイルを読み取る" },
          { name: "write_file", description: "ファイルに書き込む" },
        ],
        limit: 10,
      }),
    });

    expect(res.status).toStrictEqual(200);
    const body = (await res.json()) as { results: typeof mockResults };
    expect(body.results).toStrictEqual(mockResults);
  });

  test("searchTools がエラーをスローした場合に 500 を返す", async () => {
    vi.mocked(searchTools).mockRejectedValue(new Error("AI service error"));

    const res = await toolSearchRoute.request("/v1/tool-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "ファイルを読む",
        tools: [{ name: "read_file", description: "ファイルを読み取る" }],
        limit: 10,
      }),
    });

    expect(res.status).toStrictEqual(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Internal Server Error");
  });
});
