import { describe, expect, test } from "vitest";

import { getMcpToolsPrompt } from "../mcpToolsPrompt.js";

describe("getMcpToolsPrompt", () => {
  test("空のツール名配列の場合は空文字を返す", () => {
    expect(getMcpToolsPrompt([])).toBe("");
  });

  test("通常のツール名でプロンプトを生成する", () => {
    const result = getMcpToolsPrompt(["tool1", "tool2"]);
    expect(result).toContain("Available MCP Tools");
    expect(result).toContain("tool1, tool2");
    expect(result).not.toContain("Dynamic Search Mode");
  });

  test("Dynamic Search メタツールのみの場合は詳しい説明を生成する", () => {
    const result = getMcpToolsPrompt([
      "server1__search_tools",
      "server1__describe_tools",
      "server1__execute_tool",
    ]);
    expect(result).toContain("Dynamic Search Mode");
    expect(result).toContain("search_tools");
    expect(result).toContain("describe_tools");
    expect(result).toContain("execute_tool");
  });

  test("メタツールと通常ツールが混在する場合は通常モード", () => {
    const result = getMcpToolsPrompt(["server1__search_tools", "regular_tool"]);
    expect(result).toContain("Available MCP Tools");
    expect(result).not.toContain("Dynamic Search Mode");
  });
});
