import { afterEach, describe, expect, test } from "vitest";

import { clearCache } from "../loader.js";
import { systemPrompt } from "../systemPrompt.js";

afterEach(() => {
  clearCache();
});

describe("systemPrompt", () => {
  test("デフォルト設定でシステムプロンプトを生成する", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
    });

    // ペルソナ部分
    expect(result.prompt).toContain("friendly assistant");
    // Artifacts 指示
    expect(result.prompt).toContain("Artifacts");
  });

  test("推論モデルの場合はArtifacts指示を省略する", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet-reasoning",
    });

    expect(result.prompt).toContain("friendly assistant");
    expect(result.prompt).not.toContain("Artifacts");
  });

  test("-thinking サフィックスでもArtifacts指示を省略する", () => {
    const result = systemPrompt({
      selectedChatModel: "openai/o1-thinking",
    });

    expect(result.prompt).not.toContain("Artifacts");
  });

  test("personaId を指定するとペルソナが切り替わる", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      personaId: "coharu",
    });

    expect(result.prompt).toContain("Coharu");
  });

  test("personaContent を指定すると personaId より優先される", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      personaId: "coharu",
      personaContent: "You are a custom persona for testing.",
    });

    expect(result.prompt).toContain("custom persona for testing");
    expect(result.prompt).not.toContain("Coharu");
  });

  test("MCPツール名を指定するとツールプロンプトが含まれる", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      mcpToolNames: ["tool1", "tool2"],
    });

    expect(result.prompt).toContain("Available MCP Tools");
    expect(result.prompt).toContain("tool1");
    expect(result.prompt).toContain("tool2");
  });

  test("MCPツール名が空の場合はツールプロンプトを含まない", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      mcpToolNames: [],
    });

    expect(result.prompt).not.toContain("Available MCP Tools");
  });

  test("位置情報を指定するとリクエストヒントが含まれる", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      requestHints: {
        latitude: "35.6762",
        longitude: "139.6503",
        city: "Tokyo",
        country: "JP",
      },
    });

    expect(result.prompt).toContain("Tokyo");
    expect(result.prompt).toContain("JP");
  });

  test("Dynamic Search モードのMCPツールで詳しい説明を生成する", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      mcpToolNames: [
        "server1__search_tools",
        "server1__describe_tools",
        "server1__execute_tool",
      ],
    });

    expect(result.prompt).toContain("Dynamic Search Mode");
    expect(result.prompt).toContain("search_tools");
  });
});

describe("systemPrompt sections", () => {
  test("セクション情報が返される", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      mcpToolNames: ["tool1"],
      requestHints: {
        latitude: "35.6762",
        longitude: "139.6503",
        city: "Tokyo",
        country: "JP",
      },
    });

    const keys = result.sections.map((s) => s.key);
    expect(keys).toContain("persona");
    expect(keys).toContain("artifacts");
    expect(keys).toContain("mcpTools");
    expect(keys).toContain("requestHints");
  });

  test("空のセクションはフィルタされる", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet",
      mcpToolNames: [],
    });

    const keys = result.sections.map((s) => s.key);
    expect(keys).toContain("persona");
    expect(keys).toContain("artifacts");
    expect(keys).not.toContain("mcpTools");
    expect(keys).not.toContain("requestHints");
  });

  test("推論モデルではartifactsセクションが除外される", () => {
    const result = systemPrompt({
      selectedChatModel: "anthropic/claude-sonnet-reasoning",
    });

    const keys = result.sections.map((s) => s.key);
    expect(keys).toContain("persona");
    expect(keys).not.toContain("artifacts");
  });
});
