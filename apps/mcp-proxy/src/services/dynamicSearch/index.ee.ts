// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Dynamic Search サービス
 *
 * dynamicSearch が有効な McpServer で使用される
 * search_tools, describe_tools, execute_tool の3つのメタツールを提供
 *
 * MCP SDK の Tool 型と CallToolRequestParams 型を使用
 */

/* v8 ignore start -- re-exportのみ */

// MCP SDK 型を re-export
export type { Tool, CallToolRequestParams } from "./types.ee.js";

// Dynamic Search 固有の型定義
export type {
  SearchToolsArgs,
  DescribeToolsArgs,
  SearchResult,
} from "./types.ee.js";

// バリデーションスキーマ
export {
  SearchToolsArgsSchema,
  DescribeToolsArgsSchema,
  CallToolRequestParamsSchema,
} from "./types.ee.js";

// メタツール定義
export {
  DYNAMIC_SEARCH_META_TOOLS,
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
  META_TOOL_NAMES,
  isMetaTool,
} from "./metaToolDefinitions.ee.js";

// メタツール実装
export { searchTools } from "./searchTools.ee.js";
export { describeTools, type DescribeToolsResult } from "./describeTools.ee.js";
export { executeToolDynamic } from "./executeToolDynamic.ee.js";
/* v8 ignore stop */
