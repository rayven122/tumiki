// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * executeToolDynamic.ts のテスト
 *
 * execute_tool メタツールの単体テストを実施
 * MCP SDK の CallToolRequestParams 形式を使用
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted を使用してホイスティング問題を解決
const { mockCallToolCommand } = vi.hoisted(() => ({
  mockCallToolCommand: vi.fn(),
}));

vi.mock("../../mcp/commands/callTool/callToolCommand.js", () => ({
  callToolCommand: mockCallToolCommand,
}));

vi.mock("../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// モック設定後にインポート
import { executeToolDynamic } from "../executeToolDynamic.ee.js";

describe("executeToolDynamic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("executeTool を正しい引数で呼び出す", async () => {
    const mockResult = {
      content: [{ type: "text", text: "Success" }],
    };
    mockCallToolCommand.mockResolvedValue(mockResult);

    const result = await executeToolDynamic(
      {
        name: "github__create_issue",
        arguments: { title: "Test Issue", body: "Test body" },
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(mockCallToolCommand).toHaveBeenCalledWith({
      mcpServerId: "mcp-server-id",
      organizationId: "org-id",
      fullToolName: "github__create_issue",
      args: { title: "Test Issue", body: "Test body" },
      userId: "user-id",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("executeTool の結果をそのまま返す", async () => {
    const mockResult = {
      content: [
        { type: "text", text: "Line 1" },
        { type: "text", text: "Line 2" },
      ],
    };
    mockCallToolCommand.mockResolvedValue(mockResult);

    const result = await executeToolDynamic(
      {
        name: "slack__send_message",
        arguments: { channel: "#general", text: "Hello" },
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(result).toStrictEqual(mockResult);
  });

  test("引数なしでもexecuteToolを呼び出す（arguments省略時）", async () => {
    const mockResult = {
      content: [{ type: "text", text: "Done" }],
    };
    mockCallToolCommand.mockResolvedValue(mockResult);

    await executeToolDynamic(
      {
        name: "tool_without_args",
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(mockCallToolCommand).toHaveBeenCalledWith({
      mcpServerId: "mcp-server-id",
      organizationId: "org-id",
      fullToolName: "tool_without_args",
      args: {},
      userId: "user-id",
    });
  });

  test("空の引数でもexecuteToolを呼び出す", async () => {
    const mockResult = {
      content: [{ type: "text", text: "Done" }],
    };
    mockCallToolCommand.mockResolvedValue(mockResult);

    await executeToolDynamic(
      {
        name: "tool_with_empty_args",
        arguments: {},
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(mockCallToolCommand).toHaveBeenCalledWith({
      mcpServerId: "mcp-server-id",
      organizationId: "org-id",
      fullToolName: "tool_with_empty_args",
      args: {},
      userId: "user-id",
    });
  });

  test("executeTool がエラーを返した場合は例外をスロー", async () => {
    mockCallToolCommand.mockRejectedValue(new Error("Tool execution failed"));

    await expect(
      executeToolDynamic(
        {
          name: "failing_tool",
        },
        "mcp-server-id",
        "org-id",
        "user-id",
      ),
    ).rejects.toThrow("Tool execution failed");
  });

  test("複雑な引数構造でも正しく渡される", async () => {
    const complexArgs = {
      nested: {
        value: 123,
        array: [1, 2, 3],
      },
      boolean: true,
      nullValue: null,
    };

    mockCallToolCommand.mockResolvedValue({
      content: [{ type: "text", text: "OK" }],
    });

    await executeToolDynamic(
      {
        name: "complex_tool",
        arguments: complexArgs,
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(mockCallToolCommand).toHaveBeenCalledWith({
      mcpServerId: "mcp-server-id",
      organizationId: "org-id",
      fullToolName: "complex_tool",
      args: complexArgs,
      userId: "user-id",
    });
  });
});
