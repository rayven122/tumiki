// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * searchTools.ts のテスト
 *
 * search_tools メタツールの単体テストを実施
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// モック設定後にインポート
import { searchTools } from "../searchTools.ee.js";
import type { Tool } from "../types.ee.js";

describe("searchTools", () => {
  const mockTools: Tool[] = [
    {
      name: "github__create_issue",
      description: "GitHubにissueを作成します",
      inputSchema: {
        type: "object",
        properties: { title: { type: "string" } },
      },
    },
    {
      name: "github__list_repos",
      description: "GitHubのリポジトリ一覧を取得します",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "slack__send_message",
      description: "Slackにメッセージを送信します",
      inputSchema: {
        type: "object",
        properties: { channel: { type: "string" }, text: { type: "string" } },
      },
    },
    {
      name: "notion__create_page",
      description: "Notionにページを作成します",
      inputSchema: {
        type: "object",
        properties: { title: { type: "string" }, content: { type: "string" } },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TUMIKI_CLOUD_API_URL", "https://cloud-api.example.com");
    vi.stubEnv("TUMIKI_CLOUD_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  test("クエリに関連するツールを返す", async () => {
    const mockSearchResults = {
      results: [
        { toolName: "github__create_issue", relevanceScore: 0.95 },
        { toolName: "github__list_repos", relevanceScore: 0.7 },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSearchResults),
      }),
    );

    const results = await searchTools(
      { query: "GitHubでissueを作成したい", limit: 5 },
      mockTools,
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toStrictEqual({
      toolName: "github__create_issue",
      description: "GitHubにissueを作成します",
      relevanceScore: 0.95,
    });
    expect(results[1]).toStrictEqual({
      toolName: "github__list_repos",
      description: "GitHubのリポジトリ一覧を取得します",
      relevanceScore: 0.7,
    });
  });

  test("fetchのリクエストボディにlimitパラメータが含まれる", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await searchTools({ query: "test", limit: 3 }, mockTools);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1]?.body as string) as {
      limit: number;
    };
    expect(body.limit).toStrictEqual(3);
  });

  test("limitのデフォルト値は10", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await searchTools({ query: "test" }, mockTools);

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1]?.body as string) as {
      limit: number;
    };
    expect(body.limit).toStrictEqual(10);
  });

  test("空のツールリストの場合は空配列を返す", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const results = await searchTools({ query: "test" }, []);

    expect(results).toStrictEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("LLMが存在しないツール名を返した場合はdescriptionがundefinedになる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [{ toolName: "non_existent_tool", relevanceScore: 0.8 }],
        }),
      }),
    );

    const results = await searchTools({ query: "test" }, mockTools);

    expect(results).toHaveLength(1);
    expect(results[0]).toStrictEqual({
      toolName: "non_existent_tool",
      description: undefined,
      relevanceScore: 0.8,
    });
  });

  test("Cloud APIがエラーを返した場合は例外をスロー", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(searchTools({ query: "test" }, mockTools)).rejects.toThrow(
      "Tumiki Cloud API responded with status 500",
    );
  });

  test("fetchが例外をスローした場合は例外を再スロー", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    await expect(searchTools({ query: "test" }, mockTools)).rejects.toThrow(
      "Network error",
    );
  });

  test("ツール説明がundefinedのツールを含むリストでも正常に動作する", async () => {
    const toolsWithUndefinedDescription: Tool[] = [
      {
        name: "tool_without_desc",
        description: undefined,
        inputSchema: { type: "object" },
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [{ toolName: "tool_without_desc", relevanceScore: 0.9 }],
        }),
      }),
    );

    const results = await searchTools(
      { query: "test" },
      toolsWithUndefinedDescription,
    );

    expect(results).toHaveLength(1);
    expect(results[0].description).toBeUndefined();
  });

  test("TUMIKI_CLOUD_API_URLが未設定の場合は例外をスロー", async () => {
    vi.stubEnv("TUMIKI_CLOUD_API_URL", "");

    await expect(searchTools({ query: "test" }, mockTools)).rejects.toThrow(
      "TUMIKI_CLOUD_API_URL is not configured",
    );
  });

  test("TUMIKI_CLOUD_API_TOKENが未設定の場合は例外をスロー", async () => {
    vi.stubEnv("TUMIKI_CLOUD_API_TOKEN", "");

    await expect(searchTools({ query: "test" }, mockTools)).rejects.toThrow(
      "TUMIKI_CLOUD_API_TOKEN is not configured",
    );
  });

  test("Cloud APIにAuthorizationヘッダーとJSONボディを送信する", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await searchTools({ query: "GitHubのIssue", limit: 5 }, mockTools);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://cloud-api.example.com/v1/tool-search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }) as Record<string, string>,
      }),
    );
  });
});
