import { describe, expect, test, vi } from "vitest";

import type { ToolAggregator } from "../outbound/tool-aggregator.js";
import type { ToolSearchProvider } from "../types.js";
import {
  createDynamicSearchToolLayer,
  DYNAMIC_SEARCH_TOOL_NAMES,
} from "../dynamic-search.js";

const createMockAggregator = (
  overrides?: Partial<ToolAggregator>,
): ToolAggregator => ({
  listTools: vi.fn().mockResolvedValue([
    {
      name: "github__create_issue",
      description: "Create an issue",
      inputSchema: {},
      serverName: "github",
    },
  ]),
  callTool: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "ok" }],
    isError: false,
  }),
  ...overrides,
});

const createMockProvider = (
  overrides?: Partial<ToolSearchProvider>,
): ToolSearchProvider => ({
  searchTools: vi.fn().mockResolvedValue([
    {
      toolName: "github__create_issue",
      description: "Create an issue",
      relevanceScore: 0.95,
    },
  ]),
  describeTools: vi.fn().mockResolvedValue([
    {
      toolName: "github__create_issue",
      description: "Create an issue",
      inputSchema: { type: "object" },
      found: true,
    },
  ]),
  ...overrides,
});

describe("動的検索ツールレイヤー", () => {
  test("disabledの場合は元のaggregatorをそのまま返す", () => {
    const aggregator = createMockAggregator();
    const provider = createMockProvider();

    const wrapped = createDynamicSearchToolLayer(aggregator, {
      enabled: false,
      provider,
    });

    expect(wrapped).toBe(aggregator);
  });

  test("enabledの場合、tools/listはメタツールのみを返す", async () => {
    const listTools = vi.fn().mockResolvedValue([]);
    const aggregator = createMockAggregator({ listTools });
    const provider = createMockProvider();
    const wrapped = createDynamicSearchToolLayer(aggregator, {
      enabled: true,
      provider,
    });

    const tools = await wrapped.listTools();

    expect(tools.map((tool) => tool.name)).toStrictEqual([
      DYNAMIC_SEARCH_TOOL_NAMES.search,
      DYNAMIC_SEARCH_TOOL_NAMES.describe,
      DYNAMIC_SEARCH_TOOL_NAMES.execute,
    ]);
    expect(listTools).not.toHaveBeenCalled();
  });

  test("search_toolsはproviderのローカル検索結果をJSON textで返す", async () => {
    const provider = createMockProvider();
    const wrapped = createDynamicSearchToolLayer(createMockAggregator(), {
      enabled: true,
      provider,
    });

    const result = await wrapped.callTool("search_tools", {
      query: " create github issue ",
      limit: 5,
    });

    expect(provider.searchTools).toHaveBeenCalledWith({
      query: "create github issue",
      limit: 5,
    });
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            [
              {
                toolName: "github__create_issue",
                description: "Create an issue",
                relevanceScore: 0.95,
              },
            ],
            null,
            2,
          ),
        },
      ],
      isError: false,
    });
  });

  test("describe_toolsはproviderの保存済みスキーマを返す", async () => {
    const provider = createMockProvider();
    const wrapped = createDynamicSearchToolLayer(createMockAggregator(), {
      enabled: true,
      provider,
    });

    await wrapped.callTool("describe_tools", {
      toolNames: ["github__create_issue"],
    });

    expect(provider.describeTools).toHaveBeenCalledWith({
      toolNames: ["github__create_issue"],
    });
  });

  test("execute_toolは既存のprefixed tool routingへ委譲する", async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "created" }],
      isError: false,
    });
    const wrapped = createDynamicSearchToolLayer(
      createMockAggregator({ callTool }),
      {
        enabled: true,
        provider: createMockProvider(),
      },
    );

    const result = await wrapped.callTool("execute_tool", {
      name: "github__create_issue",
      arguments: { title: "Bug" },
    });

    expect(callTool).toHaveBeenCalledWith("github__create_issue", {
      title: "Bug",
    });
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "created" }],
      isError: false,
    });
  });

  test("execute_toolのnameは前後空白を除去して実行する", async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "created" }],
      isError: false,
    });
    const wrapped = createDynamicSearchToolLayer(
      createMockAggregator({ callTool }),
      {
        enabled: true,
        provider: createMockProvider(),
      },
    );

    await wrapped.callTool("execute_tool", {
      name: " github__create_issue ",
      arguments: { title: "Bug" },
    });

    expect(callTool).toHaveBeenCalledWith("github__create_issue", {
      title: "Bug",
    });
  });

  test("enabledの場合、元ツールの直接呼び出しは拒否する", async () => {
    const wrapped = createDynamicSearchToolLayer(createMockAggregator(), {
      enabled: true,
      provider: createMockProvider(),
    });

    await expect(wrapped.callTool("github__create_issue", {})).rejects.toThrow(
      "Unknown dynamic search meta tool",
    );
  });

  test("search_toolsに空クエリを渡すとエラーになる", async () => {
    const wrapped = createDynamicSearchToolLayer(createMockAggregator(), {
      enabled: true,
      provider: createMockProvider(),
    });

    await expect(
      wrapped.callTool("search_tools", { query: "  " }),
    ).rejects.toThrow("search_tools requires a non-empty query");
  });

  test("describe_toolsに空のtoolNamesを渡すとエラーになる", async () => {
    const wrapped = createDynamicSearchToolLayer(createMockAggregator(), {
      enabled: true,
      provider: createMockProvider(),
    });

    await expect(
      wrapped.callTool("describe_tools", { toolNames: [] }),
    ).rejects.toThrow("describe_tools requires toolNames");
  });

  test("execute_toolに空のnameを渡すとエラーになる", async () => {
    const wrapped = createDynamicSearchToolLayer(createMockAggregator(), {
      enabled: true,
      provider: createMockProvider(),
    });

    await expect(
      wrapped.callTool("execute_tool", { name: "" }),
    ).rejects.toThrow("execute_tool requires name");
  });
});
