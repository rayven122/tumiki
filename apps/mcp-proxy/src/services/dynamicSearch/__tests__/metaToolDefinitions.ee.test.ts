// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * metaToolDefinitions.ts のテスト
 *
 * メタツール定義の単体テストを実施
 * MCP SDK の Tool 型を使用
 */

import { describe, test, expect } from "vitest";

import {
  DYNAMIC_SEARCH_META_TOOLS,
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
  META_TOOL_NAMES,
  isMetaTool,
} from "../metaToolDefinitions.ee.js";

describe("metaToolDefinitions", () => {
  describe("DYNAMIC_SEARCH_META_TOOLS", () => {
    test("3つのメタツール定義を含む", () => {
      expect(DYNAMIC_SEARCH_META_TOOLS).toHaveLength(3);
    });

    test("search_tools が含まれる", () => {
      const searchTool = DYNAMIC_SEARCH_META_TOOLS.find(
        (t) => t.name === "search_tools",
      );
      expect(searchTool).toBeDefined();
      expect(searchTool).toStrictEqual(SEARCH_TOOLS_DEFINITION);
    });

    test("describe_tools が含まれる", () => {
      const describeTool = DYNAMIC_SEARCH_META_TOOLS.find(
        (t) => t.name === "describe_tools",
      );
      expect(describeTool).toBeDefined();
      expect(describeTool).toStrictEqual(DESCRIBE_TOOLS_DEFINITION);
    });

    test("execute_tool が含まれる", () => {
      const executeTool = DYNAMIC_SEARCH_META_TOOLS.find(
        (t) => t.name === "execute_tool",
      );
      expect(executeTool).toBeDefined();
      expect(executeTool).toStrictEqual(EXECUTE_TOOL_DEFINITION);
    });
  });

  describe("SEARCH_TOOLS_DEFINITION", () => {
    test("正しい名前を持つ", () => {
      expect(SEARCH_TOOLS_DEFINITION.name).toBe("search_tools");
    });

    test("説明が定義されている", () => {
      expect(SEARCH_TOOLS_DEFINITION.description).toBeDefined();
      expect(SEARCH_TOOLS_DEFINITION.description?.length).toBeGreaterThan(0);
    });

    test("inputSchemaがtype:objectとquery必須フィールドを持つ", () => {
      expect(SEARCH_TOOLS_DEFINITION.inputSchema.type).toBe("object");
      expect(SEARCH_TOOLS_DEFINITION.inputSchema.required).toContain("query");
    });
  });

  describe("DESCRIBE_TOOLS_DEFINITION", () => {
    test("正しい名前を持つ", () => {
      expect(DESCRIBE_TOOLS_DEFINITION.name).toBe("describe_tools");
    });

    test("inputSchemaがtype:objectとtoolNames必須フィールドを持つ", () => {
      expect(DESCRIBE_TOOLS_DEFINITION.inputSchema.type).toBe("object");
      expect(DESCRIBE_TOOLS_DEFINITION.inputSchema.required).toContain(
        "toolNames",
      );
    });
  });

  describe("EXECUTE_TOOL_DEFINITION", () => {
    test("正しい名前を持つ", () => {
      expect(EXECUTE_TOOL_DEFINITION.name).toBe("execute_tool");
    });

    test("inputSchemaがtype:objectとname必須フィールドを持つ（MCP SDK形式）", () => {
      expect(EXECUTE_TOOL_DEFINITION.inputSchema.type).toBe("object");
      // MCP SDK の CallToolRequestParams に準拠: name フィールドが必須
      expect(EXECUTE_TOOL_DEFINITION.inputSchema.required).toContain("name");
    });
  });

  describe("META_TOOL_NAMES", () => {
    test("3つのメタツール名を含む", () => {
      expect(META_TOOL_NAMES.size).toBe(3);
    });

    test("search_tools を含む", () => {
      expect(META_TOOL_NAMES.has("search_tools")).toBe(true);
    });

    test("describe_tools を含む", () => {
      expect(META_TOOL_NAMES.has("describe_tools")).toBe(true);
    });

    test("execute_tool を含む", () => {
      expect(META_TOOL_NAMES.has("execute_tool")).toBe(true);
    });
  });

  describe("isMetaTool", () => {
    test("search_tools はメタツール", () => {
      expect(isMetaTool("search_tools")).toBe(true);
    });

    test("describe_tools はメタツール", () => {
      expect(isMetaTool("describe_tools")).toBe(true);
    });

    test("execute_tool はメタツール", () => {
      expect(isMetaTool("execute_tool")).toBe(true);
    });

    test("github__create_issue はメタツールではない", () => {
      expect(isMetaTool("github__create_issue")).toBe(false);
    });

    test("空文字列はメタツールではない", () => {
      expect(isMetaTool("")).toBe(false);
    });

    test("類似名はメタツールではない", () => {
      expect(isMetaTool("search_tool")).toBe(false);
      expect(isMetaTool("SEARCH_TOOLS")).toBe(false);
    });
  });
});
