/**
 * Dynamic Search サービス
 *
 * dynamicSearch が有効な McpServer で使用される
 * search_tools, describe_tools, execute_tool の3つのメタツールを提供
 *
 * MCP SDK の Tool 型と CallToolRequestParams 型を使用
 */

// MCP SDK 型を re-export（推奨）
export type { Tool, CallToolRequestParams } from "./types.js";

// Dynamic Search 固有の型定義
export type {
  SearchToolsArgs,
  DescribeToolsArgs,
  SearchResult,
} from "./types.js";

// バリデーションスキーマ
export {
  SearchToolsArgsSchema,
  DescribeToolsArgsSchema,
  CallToolRequestParamsSchema,
} from "./types.js";

// メタツール定義
export {
  DYNAMIC_SEARCH_META_TOOLS,
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
  META_TOOL_NAMES,
  isMetaTool,
} from "./metaToolDefinitions.js";

// メタツール実装
export { searchTools } from "./searchTools.js";
export { describeTools, type DescribeToolsResult } from "./describeTools.js";
export { executeToolDynamic } from "./executeToolDynamic.js";
