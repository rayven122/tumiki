import { describe, test, expect, vi, beforeEach } from "vitest";

// vi.hoisted を使用してモック関数を定義（vi.mockよりも先に評価される）
const {
  mockFindUnique,
  mockLogInfo,
  mockLogWarn,
  mockLogError,
  mockMetaTools,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogWarn: vi.fn(),
  mockLogError: vi.fn(),
  mockMetaTools: { value: [] as Array<{ name: string }> },
}));

// @tumiki/db/server のモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    mcpServer: {
      findUnique: mockFindUnique,
    },
  },
}));

// logger のモック
vi.mock("../../libs/logger/index.js", () => ({
  logInfo: (message: string, metadata?: unknown): void => {
    mockLogInfo(message, metadata);
  },
  logWarn: (message: string, metadata?: unknown): void => {
    mockLogWarn(message, metadata);
  },
  logError: (message: string, error?: Error, metadata?: unknown): void => {
    mockLogError(message, error, metadata);
  },
}));

// dynamicSearch のモック（CE版を想定: メタツール空配列）
vi.mock("../dynamicSearch/index.js", () => ({
  get DYNAMIC_SEARCH_META_TOOLS() {
    return mockMetaTools.value;
  },
}));

// requestLogging/context のモック
vi.mock("../../middleware/requestLogging/context.js", () => ({
  updateExecutionContext: vi.fn(),
}));

import { getAllowedTools } from "../toolExecutor.js";

describe("getAllowedTools", () => {
  const mcpServerId = "server-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockMetaTools.value = []; // デフォルトはCE版（メタツール空）
  });

  test("McpServerが見つからない場合はエラーをスローする", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(getAllowedTools(mcpServerId)).rejects.toThrow(
      `Failed to get allowed tools for server ${mcpServerId}: McpServer not found: ${mcpServerId}`,
    );

    expect(mockLogError).toHaveBeenCalledWith(
      "Failed to get allowed tools",
      expect.any(Error),
      { mcpServerId },
    );
  });

  test("dynamicSearch=false の場合、通常のツールリストを返す", async () => {
    mockFindUnique.mockResolvedValue({
      dynamicSearch: false,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: "Tool 1 description",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        },
      ],
    });

    const result = await getAllowedTools(mcpServerId);

    expect(result.dynamicSearch).toBe(false);
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("instance1__tool1");
    expect(result.tools[0].description).toBe("Tool 1 description");
  });

  test("dynamicSearch=true かつ EE版（メタツールあり）の場合、メタツールを返す", async () => {
    // EE版をシミュレート
    mockMetaTools.value = [
      { name: "search_tools" },
      { name: "describe_tools" },
      { name: "execute_tool" },
    ];

    mockFindUnique.mockResolvedValue({
      dynamicSearch: true,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: "Tool 1",
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await getAllowedTools(mcpServerId);

    expect(result.dynamicSearch).toBe(true);
    expect(result.tools).toHaveLength(3);
    expect(result.tools.map((t) => t.name)).toStrictEqual([
      "search_tools",
      "describe_tools",
      "execute_tool",
    ]);
    expect(mockLogInfo).toHaveBeenCalledWith(
      "Dynamic Search enabled, returning meta tools",
      { mcpServerId, metaToolCount: 3 },
    );
  });

  test("dynamicSearch=true かつ CE版（メタツールなし）の場合、警告ログを出力して通常のツールリストにフォールバック", async () => {
    // CE版（メタツール空配列）
    mockMetaTools.value = [];

    mockFindUnique.mockResolvedValue({
      dynamicSearch: true,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: "Tool 1",
              inputSchema: { type: "object" },
            },
            {
              name: "tool2",
              description: null,
              inputSchema: { type: "object", properties: { arg: {} } },
            },
          ],
        },
        {
          normalizedName: "instance2",
          allowedTools: [
            {
              name: "tool3",
              description: "Tool 3",
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await getAllowedTools(mcpServerId);

    // フォールバック: 通常のツールリストを返す
    expect(result.dynamicSearch).toBe(false);
    expect(result.tools).toHaveLength(3);
    expect(result.tools.map((t) => t.name)).toStrictEqual([
      "instance1__tool1",
      "instance1__tool2",
      "instance2__tool3",
    ]);

    // 警告ログが出力されることを確認
    expect(mockLogWarn).toHaveBeenCalledWith(
      "Dynamic Search enabled but meta tools not available (CE version). Falling back to normal tools.",
      { mcpServerId },
    );
  });

  test("複数のテンプレートインスタンスから全ツールを集約する", async () => {
    mockFindUnique.mockResolvedValue({
      dynamicSearch: false,
      templateInstances: [
        {
          normalizedName: "slack",
          allowedTools: [
            {
              name: "send_message",
              description: "Send a message",
              inputSchema: { type: "object" },
            },
            {
              name: "list_channels",
              description: "List channels",
              inputSchema: { type: "object" },
            },
          ],
        },
        {
          normalizedName: "github",
          allowedTools: [
            {
              name: "create_issue",
              description: "Create an issue",
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await getAllowedTools(mcpServerId);

    expect(result.tools).toHaveLength(3);
    expect(result.tools.map((t) => t.name)).toStrictEqual([
      "slack__send_message",
      "slack__list_channels",
      "github__create_issue",
    ]);
  });

  test("description が null の場合は undefined に変換される", async () => {
    mockFindUnique.mockResolvedValue({
      dynamicSearch: false,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: null,
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await getAllowedTools(mcpServerId);

    expect(result.tools[0].description).toBeUndefined();
  });
});
