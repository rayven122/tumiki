import { describe, expect, test } from "vitest";

import {
  McpScanOutputSchema,
  ScanInputSchema,
  ScanResultSchema,
  ScanStatusSchema,
  SeveritySchema,
  ToolDefinitionSchema,
  VulnerabilitySchema,
  VulnerabilityTypeSchema,
} from "../../security/types.js";

describe("VulnerabilityTypeSchema", () => {
  test("有効な脆弱性タイプを受け入れる", () => {
    const validTypes = [
      "tool_poisoning",
      "prompt_injection",
      "cross_origin_escalation",
      "rug_pull",
      "unknown",
    ];

    for (const type of validTypes) {
      const result = VulnerabilityTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  test("無効な脆弱性タイプを拒否する", () => {
    const result = VulnerabilityTypeSchema.safeParse("invalid_type");
    expect(result.success).toBe(false);
  });
});

describe("SeveritySchema", () => {
  test("有効な重大度を受け入れる", () => {
    const validSeverities = ["low", "medium", "high", "critical"];

    for (const severity of validSeverities) {
      const result = SeveritySchema.safeParse(severity);
      expect(result.success).toBe(true);
    }
  });

  test("無効な重大度を拒否する", () => {
    const result = SeveritySchema.safeParse("extreme");
    expect(result.success).toBe(false);
  });
});

describe("VulnerabilitySchema", () => {
  test("有効な脆弱性オブジェクトを受け入れる", () => {
    const vulnerability = {
      type: "tool_poisoning",
      toolName: "malicious_tool",
      description: "悪意のあるツール",
      severity: "high",
    };

    const result = VulnerabilitySchema.safeParse(vulnerability);
    expect(result.success).toBe(true);
  });

  test("詳細情報付きの脆弱性オブジェクトを受け入れる", () => {
    const vulnerability = {
      type: "prompt_injection",
      toolName: "test_tool",
      description: "プロンプトインジェクション",
      severity: "critical",
      details: "詳細な説明",
    };

    const result = VulnerabilitySchema.safeParse(vulnerability);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toBe("詳細な説明");
    }
  });

  test("必須フィールドが欠けている場合は拒否する", () => {
    const incomplete = {
      type: "tool_poisoning",
      toolName: "test",
    };

    const result = VulnerabilitySchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

describe("ScanStatusSchema", () => {
  test("有効なステータスを受け入れる", () => {
    const validStatuses = ["clean", "vulnerable", "error"];

    for (const status of validStatuses) {
      const result = ScanStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });
});

describe("ScanResultSchema", () => {
  test("クリーンなスキャン結果を受け入れる", () => {
    const scanResult = {
      serverName: "test-server",
      scanTimestamp: new Date().toISOString(),
      vulnerabilities: [],
      status: "clean",
    };

    const result = ScanResultSchema.safeParse(scanResult);
    expect(result.success).toBe(true);
  });

  test("脆弱性を含むスキャン結果を受け入れる", () => {
    const scanResult = {
      serverName: "test-server",
      scanTimestamp: new Date().toISOString(),
      vulnerabilities: [
        {
          type: "tool_poisoning",
          toolName: "malicious_tool",
          description: "悪意のあるツール",
          severity: "high",
        },
      ],
      status: "vulnerable",
      executionTimeMs: 1500,
    };

    const result = ScanResultSchema.safeParse(scanResult);
    expect(result.success).toBe(true);
  });

  test("エラースキャン結果を受け入れる", () => {
    const scanResult = {
      serverName: "test-server",
      scanTimestamp: new Date().toISOString(),
      vulnerabilities: [],
      status: "error",
      errorMessage: "接続タイムアウト",
    };

    const result = ScanResultSchema.safeParse(scanResult);
    expect(result.success).toBe(true);
  });
});

describe("ToolDefinitionSchema", () => {
  test("基本的なツール定義を受け入れる", () => {
    const tool = {
      name: "test_tool",
      inputSchema: {},
    };

    const result = ToolDefinitionSchema.safeParse(tool);
    expect(result.success).toBe(true);
  });

  test("説明付きツール定義を受け入れる", () => {
    const tool = {
      name: "test_tool",
      description: "テストツール",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
      },
    };

    const result = ToolDefinitionSchema.safeParse(tool);
    expect(result.success).toBe(true);
  });

  test("名前が欠けている場合は拒否する", () => {
    const tool = {
      description: "テストツール",
      inputSchema: {},
    };

    const result = ToolDefinitionSchema.safeParse(tool);
    expect(result.success).toBe(false);
  });
});

describe("ScanInputSchema", () => {
  test("有効なスキャン入力を受け入れる", () => {
    const input = {
      serverName: "test-server",
      serverUrl: "https://mcp.example.com/sse",
    };

    const result = ScanInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("認証ヘッダー付きのスキャン入力を受け入れる", () => {
    const input = {
      serverName: "test-server",
      serverUrl: "https://mcp.example.com/sse",
      headers: {
        Authorization: "Bearer token123",
        "X-Custom-Header": "value",
      },
    };

    const result = ScanInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.headers).toStrictEqual({
        Authorization: "Bearer token123",
        "X-Custom-Header": "value",
      });
    }
  });

  test("無効なURLは拒否する", () => {
    const input = {
      serverName: "test-server",
      serverUrl: "invalid-url",
    };

    const result = ScanInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("サーバー名がない場合は拒否する", () => {
    const input = {
      serverUrl: "https://mcp.example.com/sse",
    };

    const result = ScanInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("サーバーURLがない場合は拒否する", () => {
    const input = {
      serverName: "test-server",
    };

    const result = ScanInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("McpScanOutputSchema", () => {
  // mcp-scan の出力形式は { "/path/to/config.json": { ... } } のレコード形式
  test("サーバー固有のissuesを含む出力を受け入れる", () => {
    const output = {
      "/tmp/mcp.json": {
        client: "/tmp/mcp.json",
        path: "/tmp/mcp.json",
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
      },
    };

    const result = McpScanOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  test("グローバルissuesを含む出力を受け入れる", () => {
    const output = {
      "/tmp/mcp.json": {
        client: "/tmp/mcp.json",
        path: "/tmp/mcp.json",
        issues: [
          {
            type: "prompt_injection",
            toolName: "test_tool",
            message: "インジェクション検出",
            severity: "critical",
          },
        ],
      },
    };

    const result = McpScanOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  test("空の出力を受け入れる", () => {
    const output = {};

    const result = McpScanOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  test("サーバー接続エラーを含む出力を受け入れる", () => {
    const output = {
      "/tmp/mcp.json": {
        servers: [
          {
            name: "test-server",
            error: {
              message: "could not start server",
              is_failure: true,
            },
          },
        ],
      },
    };

    const result = McpScanOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  test("警告コードを含む出力を受け入れる", () => {
    const output = {
      "/tmp/mcp.json": {
        issues: [
          {
            code: "W004",
            message: "The MCP server is not in our registry.",
          },
        ],
      },
    };

    const result = McpScanOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });
});
