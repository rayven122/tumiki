/**
 * describeTools.ts のテスト
 *
 * describe_tools メタツールの単体テストを実施
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

// モック設定後にインポート
import { describeTools } from "../describeTools.js";
import type { ToolInfo } from "../types.js";

describe("describeTools", () => {
  const mockTools: ToolInfo[] = [
    {
      name: "github__create_issue",
      description: "GitHubにissueを作成します",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "issueのタイトル" },
          body: { type: "string", description: "issueの本文" },
        },
        required: ["title"],
      },
    },
    {
      name: "slack__send_message",
      description: "Slackにメッセージを送信します",
      inputSchema: {
        type: "object",
        properties: {
          channel: { type: "string", description: "送信先チャンネル" },
          text: { type: "string", description: "メッセージ本文" },
        },
        required: ["channel", "text"],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("指定したツールの詳細情報を返す", async () => {
    const results = await describeTools(
      { toolNames: ["github__create_issue"] },
      mockTools,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toStrictEqual({
      toolName: "github__create_issue",
      description: "GitHubにissueを作成します",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "issueのタイトル" },
          body: { type: "string", description: "issueの本文" },
        },
        required: ["title"],
      },
      found: true,
    });
  });

  test("複数のツールの詳細情報を返す", async () => {
    const results = await describeTools(
      { toolNames: ["github__create_issue", "slack__send_message"] },
      mockTools,
    );

    expect(results).toHaveLength(2);
    expect(results[0].toolName).toBe("github__create_issue");
    expect(results[0].found).toBe(true);
    expect(results[1].toolName).toBe("slack__send_message");
    expect(results[1].found).toBe(true);
  });

  test("存在しないツールの場合はfound=falseを返す", async () => {
    const results = await describeTools(
      { toolNames: ["non_existent_tool"] },
      mockTools,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toStrictEqual({
      toolName: "non_existent_tool",
      description: null,
      inputSchema: {},
      found: false,
    });
  });

  test("存在するツールと存在しないツールが混在する場合", async () => {
    const results = await describeTools(
      { toolNames: ["github__create_issue", "non_existent_tool"] },
      mockTools,
    );

    expect(results).toHaveLength(2);
    expect(results[0].found).toBe(true);
    expect(results[0].toolName).toBe("github__create_issue");
    expect(results[1].found).toBe(false);
    expect(results[1].toolName).toBe("non_existent_tool");
  });

  test("空のツール名配列の場合は空配列を返す", async () => {
    const results = await describeTools({ toolNames: [] }, mockTools);

    expect(results).toStrictEqual([]);
  });

  test("空の内部ツールリストの場合は全てfound=falseを返す", async () => {
    const results = await describeTools(
      { toolNames: ["github__create_issue"] },
      [],
    );

    expect(results).toHaveLength(1);
    expect(results[0].found).toBe(false);
  });

  test("説明がnullのツールでも正常に動作する", async () => {
    const toolsWithNullDescription: ToolInfo[] = [
      {
        name: "tool_without_desc",
        description: null,
        inputSchema: { type: "object" },
      },
    ];

    const results = await describeTools(
      { toolNames: ["tool_without_desc"] },
      toolsWithNullDescription,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toStrictEqual({
      toolName: "tool_without_desc",
      description: null,
      inputSchema: { type: "object" },
      found: true,
    });
  });
});
