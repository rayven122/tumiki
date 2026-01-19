/**
 * executeToolDynamic.ts のテスト
 *
 * execute_tool メタツールの単体テストを実施
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted を使用してホイスティング問題を解決
const { mockExecuteTool } = vi.hoisted(() => ({
  mockExecuteTool: vi.fn(),
}));

vi.mock("../../toolExecutor.js", () => ({
  executeTool: mockExecuteTool,
}));

vi.mock("../../../libs/logger/index.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// モック設定後にインポート
import { executeToolDynamic } from "../executeToolDynamic.js";

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
    mockExecuteTool.mockResolvedValue(mockResult);

    const result = await executeToolDynamic(
      {
        toolName: "github__create_issue",
        arguments: { title: "Test Issue", body: "Test body" },
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(mockExecuteTool).toHaveBeenCalledWith(
      "mcp-server-id",
      "org-id",
      "github__create_issue",
      { title: "Test Issue", body: "Test body" },
      "user-id",
    );
    expect(result).toStrictEqual(mockResult);
  });

  test("executeTool の結果をそのまま返す", async () => {
    const mockResult = {
      content: [
        { type: "text", text: "Line 1" },
        { type: "text", text: "Line 2" },
      ],
    };
    mockExecuteTool.mockResolvedValue(mockResult);

    const result = await executeToolDynamic(
      {
        toolName: "slack__send_message",
        arguments: { channel: "#general", text: "Hello" },
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(result).toStrictEqual(mockResult);
  });

  test("空の引数でもexecuteToolを呼び出す", async () => {
    const mockResult = {
      content: [{ type: "text", text: "Done" }],
    };
    mockExecuteTool.mockResolvedValue(mockResult);

    await executeToolDynamic(
      {
        toolName: "tool_without_args",
        arguments: {},
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(mockExecuteTool).toHaveBeenCalledWith(
      "mcp-server-id",
      "org-id",
      "tool_without_args",
      {},
      "user-id",
    );
  });

  test("executeTool がエラーを返した場合は例外をスロー", async () => {
    mockExecuteTool.mockRejectedValue(new Error("Tool execution failed"));

    await expect(
      executeToolDynamic(
        {
          toolName: "failing_tool",
          arguments: {},
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

    mockExecuteTool.mockResolvedValue({
      content: [{ type: "text", text: "OK" }],
    });

    await executeToolDynamic(
      {
        toolName: "complex_tool",
        arguments: complexArgs,
      },
      "mcp-server-id",
      "org-id",
      "user-id",
    );

    expect(mockExecuteTool).toHaveBeenCalledWith(
      "mcp-server-id",
      "org-id",
      "complex_tool",
      complexArgs,
      "user-id",
    );
  });
});
