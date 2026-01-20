import { describe, expect, test } from "vitest";

import {
  mapSeverity,
  mapVulnerabilityType,
  parseMcpScanOutput,
} from "../../security/scanner.js";

describe("mapVulnerabilityType", () => {
  test("undefinedの場合はunknownを返す", () => {
    expect(mapVulnerabilityType(undefined)).toBe("unknown");
  });

  test("空文字の場合はunknownを返す", () => {
    expect(mapVulnerabilityType("")).toBe("unknown");
  });

  test("tool_poisoningを検出する", () => {
    expect(mapVulnerabilityType("tool_poisoning")).toBe("tool_poisoning");
    expect(mapVulnerabilityType("Tool Poisoning")).toBe("tool_poisoning");
    expect(mapVulnerabilityType("TOOL-POISONING")).toBe("tool_poisoning");
    expect(mapVulnerabilityType("toolpoisoning")).toBe("tool_poisoning");
    expect(mapVulnerabilityType("poison")).toBe("tool_poisoning");
    expect(mapVulnerabilityType("Poison Attack")).toBe("tool_poisoning");
  });

  test("prompt_injectionを検出する", () => {
    expect(mapVulnerabilityType("prompt_injection")).toBe("prompt_injection");
    expect(mapVulnerabilityType("Prompt Injection")).toBe("prompt_injection");
    expect(mapVulnerabilityType("PROMPT-INJECTION")).toBe("prompt_injection");
    expect(mapVulnerabilityType("injection")).toBe("prompt_injection");
  });

  test("cross_origin_escalationを検出する", () => {
    expect(mapVulnerabilityType("cross_origin_escalation")).toBe(
      "cross_origin_escalation",
    );
    expect(mapVulnerabilityType("Cross Origin Escalation")).toBe(
      "cross_origin_escalation",
    );
    expect(mapVulnerabilityType("crossorigin")).toBe("cross_origin_escalation");
    expect(mapVulnerabilityType("escalation")).toBe("cross_origin_escalation");
  });

  test("rug_pullを検出する", () => {
    expect(mapVulnerabilityType("rug_pull")).toBe("rug_pull");
    expect(mapVulnerabilityType("Rug Pull")).toBe("rug_pull");
    expect(mapVulnerabilityType("RUG-PULL")).toBe("rug_pull");
    expect(mapVulnerabilityType("rugpull")).toBe("rug_pull");
    expect(mapVulnerabilityType("rug")).toBe("rug_pull");
  });

  test("未知のタイプはunknownを返す", () => {
    expect(mapVulnerabilityType("unknown_vulnerability")).toBe("unknown");
    expect(mapVulnerabilityType("some_other_type")).toBe("unknown");
    expect(mapVulnerabilityType("random")).toBe("unknown");
  });
});

describe("mapSeverity", () => {
  test("undefinedの場合はmediumを返す", () => {
    expect(mapSeverity(undefined)).toBe("medium");
  });

  test("空文字の場合はmediumを返す", () => {
    expect(mapSeverity("")).toBe("medium");
  });

  test("criticalを検出する", () => {
    expect(mapSeverity("critical")).toBe("critical");
    expect(mapSeverity("Critical")).toBe("critical");
    expect(mapSeverity("CRITICAL")).toBe("critical");
    expect(mapSeverity("crit")).toBe("critical");
  });

  test("highを検出する", () => {
    expect(mapSeverity("high")).toBe("high");
    expect(mapSeverity("High")).toBe("high");
    expect(mapSeverity("HIGH")).toBe("high");
    expect(mapSeverity("h")).toBe("high");
    expect(mapSeverity("H")).toBe("high");
  });

  test("lowを検出する", () => {
    expect(mapSeverity("low")).toBe("low");
    expect(mapSeverity("Low")).toBe("low");
    expect(mapSeverity("LOW")).toBe("low");
    expect(mapSeverity("l")).toBe("low");
    expect(mapSeverity("L")).toBe("low");
  });

  test("未知の重大度はmediumを返す", () => {
    expect(mapSeverity("unknown")).toBe("medium");
    expect(mapSeverity("moderate")).toBe("medium");
    expect(mapSeverity("info")).toBe("medium");
    expect(mapSeverity("medium")).toBe("medium");
  });
});

// mcp-scan の出力形式を作成するヘルパー関数
// 実際の形式: { "/path/to/config.json": { servers: [...], issues: [...] } }
const createMcpScanOutput = (
  configResult: {
    servers?: Array<{
      name?: string;
      error?: { message?: string; is_failure?: boolean };
      issues?: Array<{
        code?: string;
        type?: string;
        tool?: string;
        toolName?: string;
        description?: string;
        message?: string;
        severity?: string;
        details?: string;
      }>;
    }>;
    issues?: Array<{
      code?: string;
      type?: string;
      tool?: string;
      toolName?: string;
      description?: string;
      message?: string;
      severity?: string;
      details?: string;
    }>;
  } = {},
) => {
  return JSON.stringify({
    "/tmp/mcp.json": {
      client: "/tmp/mcp.json",
      path: "/tmp/mcp.json",
      ...configResult,
    },
  });
};

describe("parseMcpScanOutput", () => {
  test("空のJSON出力をパースする", () => {
    const result = parseMcpScanOutput("{}", "test-server");

    expect(result.vulnerabilities).toStrictEqual([]);
    expect(result.parseError).toBeUndefined();
  });

  test("空のserversとissuesをパースする", () => {
    const output = createMcpScanOutput({
      servers: [],
      issues: [],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toStrictEqual([]);
    expect(result.parseError).toBeUndefined();
  });

  test("サーバー固有のissuesをパースする", () => {
    const output = createMcpScanOutput({
      servers: [
        {
          name: "test-server",
          issues: [
            {
              type: "tool_poisoning",
              tool: "malicious_tool",
              description: "悪意のあるツール",
              severity: "high",
            },
          ],
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0]).toStrictEqual({
      type: "tool_poisoning",
      toolName: "malicious_tool",
      description: "悪意のあるツール",
      severity: "high",
      details: undefined,
    });
  });

  test("異なるサーバー名のissuesは無視する", () => {
    const output = createMcpScanOutput({
      servers: [
        {
          name: "other-server",
          issues: [
            {
              type: "tool_poisoning",
              tool: "malicious_tool",
              description: "悪意のあるツール",
              severity: "high",
            },
          ],
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toStrictEqual([]);
  });

  test("グローバルissuesをパースする", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          type: "prompt_injection",
          toolName: "injection_tool",
          message: "プロンプトインジェクション検出",
          severity: "critical",
          details: "詳細情報",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0]).toStrictEqual({
      type: "prompt_injection",
      toolName: "injection_tool",
      description: "プロンプトインジェクション検出",
      severity: "critical",
      details: "詳細情報",
    });
  });

  test("サーバー固有のissuesがグローバルissuesより優先される", () => {
    const output = createMcpScanOutput({
      servers: [
        {
          name: "test-server",
          issues: [
            {
              type: "tool_poisoning",
              tool: "server_specific",
              description: "サーバー固有",
              severity: "high",
            },
          ],
        },
      ],
      issues: [
        {
          type: "prompt_injection",
          tool: "global_issue",
          description: "グローバル",
          severity: "low",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0]?.toolName).toBe("server_specific");
  });

  test("toolフィールドがない場合はtoolNameを使用する", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          type: "poison",
          toolName: "alternate_tool",
          description: "テスト",
          severity: "medium",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities[0]?.toolName).toBe("alternate_tool");
  });

  test("toolもtoolNameもない場合はunknownを使用する", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          type: "poison",
          description: "テスト",
          severity: "medium",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities[0]?.toolName).toBe("unknown");
  });

  test("descriptionがない場合はmessageを使用する", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          type: "poison",
          tool: "test",
          message: "代替メッセージ",
          severity: "medium",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities[0]?.description).toBe("代替メッセージ");
  });

  test("descriptionもmessageもない場合はデフォルトメッセージを使用する", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          type: "poison",
          tool: "test",
          severity: "medium",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities[0]?.description).toBe("No description");
  });

  test("複数のissuesをパースする", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          type: "tool_poisoning",
          tool: "tool1",
          description: "説明1",
          severity: "high",
        },
        {
          type: "prompt_injection",
          tool: "tool2",
          description: "説明2",
          severity: "critical",
        },
        {
          type: "rug_pull",
          tool: "tool3",
          description: "説明3",
          severity: "low",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toHaveLength(3);
    expect(result.vulnerabilities[0]?.type).toBe("tool_poisoning");
    expect(result.vulnerabilities[1]?.type).toBe("prompt_injection");
    expect(result.vulnerabilities[2]?.type).toBe("rug_pull");
  });

  test("不正なJSONはエラーを返す", () => {
    const result = parseMcpScanOutput("invalid json {", "test-server");

    expect(result.vulnerabilities).toStrictEqual([]);
    expect(result.parseError).toContain("JSON parse error");
  });

  test("無効なスキーマ形式はエラーを返す", () => {
    const result = parseMcpScanOutput('"unexpected string"', "test-server");

    expect(result.vulnerabilities).toStrictEqual([]);
    expect(result.parseError).toContain("Invalid mcp-scan output format");
  });

  test("配列形式はエラーを返す", () => {
    const result = parseMcpScanOutput("[]", "test-server");

    expect(result.vulnerabilities).toStrictEqual([]);
    expect(result.parseError).toContain("Invalid mcp-scan output format");
  });

  test("脆弱性タイプのマッピングが正しく行われる", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          type: "Tool Poisoning",
          tool: "t1",
          description: "d1",
          severity: "h",
        },
        {
          type: "cross-origin-escalation",
          tool: "t2",
          description: "d2",
          severity: "crit",
        },
        { type: "unknown_type", tool: "t3", description: "d3" },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities[0]?.type).toBe("tool_poisoning");
    expect(result.vulnerabilities[0]?.severity).toBe("high");
    expect(result.vulnerabilities[1]?.type).toBe("cross_origin_escalation");
    expect(result.vulnerabilities[1]?.severity).toBe("critical");
    expect(result.vulnerabilities[2]?.type).toBe("unknown");
    expect(result.vulnerabilities[2]?.severity).toBe("medium");
  });

  test("W004などの警告コードはスキップされる", () => {
    const output = createMcpScanOutput({
      issues: [
        {
          code: "W004",
          message: "The MCP server is not in our registry.",
        },
        {
          type: "tool_poisoning",
          tool: "malicious",
          description: "脆弱性",
          severity: "high",
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0]?.type).toBe("tool_poisoning");
  });

  test("サーバー接続エラーを検出する", () => {
    const output = createMcpScanOutput({
      servers: [
        {
          name: "test-server",
          error: {
            message: "could not start server",
            is_failure: true,
          },
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.vulnerabilities).toStrictEqual([]);
    expect(result.serverError).toBe("could not start server");
  });

  test("サーバー接続エラーがない場合はserverErrorがundefined", () => {
    const output = createMcpScanOutput({
      servers: [
        {
          name: "test-server",
          issues: [],
        },
      ],
    });

    const result = parseMcpScanOutput(output, "test-server");

    expect(result.serverError).toBeUndefined();
  });
});
