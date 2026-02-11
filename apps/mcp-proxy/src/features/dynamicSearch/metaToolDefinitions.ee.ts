// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Dynamic Search 用のメタツール定義（EE re-export）
 *
 * 統合された定義を execution/shared からインポートし、
 * MCP SDK の Tool 型にキャストしてエクスポートする。
 */

import type { Tool } from "./types.ee.js";
import {
  DYNAMIC_SEARCH_META_TOOLS as META_TOOLS,
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
  META_TOOL_NAMES,
  isMetaToolName,
} from "../execution/index.js";

/**
 * MCP SDK Tool 型へのキャスト
 * execution/shared の MetaToolDefinition は MCP SDK の Tool と互換性がある
 */
const SEARCH_TOOL: Tool = SEARCH_TOOLS_DEFINITION as Tool;
const DESCRIBE_TOOL: Tool = DESCRIBE_TOOLS_DEFINITION as Tool;
const EXECUTE_TOOL: Tool = EXECUTE_TOOL_DEFINITION as Tool;

export {
  SEARCH_TOOL as SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOL as DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL as EXECUTE_TOOL_DEFINITION,
  META_TOOL_NAMES,
};

/**
 * 全メタツール定義の配列
 */
export const DYNAMIC_SEARCH_META_TOOLS: Tool[] = META_TOOLS as Tool[];

/**
 * 指定された名前がメタツールかどうかを判定
 */
export const isMetaTool = isMetaToolName;
