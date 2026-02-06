// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * searchTools.ts のテスト
 *
 * search_tools メタツールの単体テストを実施
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted を使用してホイスティング問題を解決
const { mockGenerateObject } = vi.hoisted(() => ({
  mockGenerateObject: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: mockGenerateObject,
}));

vi.mock("../../../libs/ai/index.js", () => ({
  gateway: vi.fn(() => "mock-model"),
  DYNAMIC_SEARCH_MODEL: "anthropic/claude-3.5-haiku",
}));

vi.mock("../../../libs/logger/index.js", () => ({
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("クエリに関連するツールを返す", async () => {
    const mockSearchResults = {
      results: [
        { toolName: "github__create_issue", relevanceScore: 0.95 },
        { toolName: "github__list_repos", relevanceScore: 0.7 },
      ],
    };

    mockGenerateObject.mockResolvedValue({ object: mockSearchResults });

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

  test("limitパラメータがプロンプトに含まれる", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { results: [] },
    });

    await searchTools({ query: "test", limit: 3 }, mockTools);

    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateObject.mock.calls[0]?.[0] as
      | { prompt?: string }
      | undefined;
    expect(callArgs?.prompt).toContain("最大3件");
  });

  test("limitのデフォルト値は10", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { results: [] },
    });

    await searchTools({ query: "test" }, mockTools);

    const callArgs = mockGenerateObject.mock.calls[0]?.[0] as
      | { prompt?: string }
      | undefined;
    expect(callArgs?.prompt).toContain("最大10件");
  });

  test("空のツールリストの場合は空配列を返す", async () => {
    const results = await searchTools({ query: "test" }, []);

    expect(results).toStrictEqual([]);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  test("LLMが存在しないツール名を返した場合はdescriptionがundefinedになる", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        results: [{ toolName: "non_existent_tool", relevanceScore: 0.8 }],
      },
    });

    const results = await searchTools({ query: "test" }, mockTools);

    expect(results).toHaveLength(1);
    expect(results[0]).toStrictEqual({
      toolName: "non_existent_tool",
      description: undefined,
      relevanceScore: 0.8,
    });
  });

  test("LLMがエラーを返した場合は例外をスロー", async () => {
    mockGenerateObject.mockRejectedValue(new Error("LLM API error"));

    await expect(searchTools({ query: "test" }, mockTools)).rejects.toThrow(
      "LLM API error",
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

    mockGenerateObject.mockResolvedValue({
      object: {
        results: [{ toolName: "tool_without_desc", relevanceScore: 0.9 }],
      },
    });

    const results = await searchTools(
      { query: "test" },
      toolsWithUndefinedDescription,
    );

    expect(results).toHaveLength(1);
    expect(results[0].description).toBeUndefined();
  });
});
