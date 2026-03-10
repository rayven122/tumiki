/**
 * Dynamic Search サービス (CE Facade)
 *
 * Community Edition では Dynamic Search 機能が無効。
 * EE版との型互換性を維持するため、スタブ実装と型をエクスポートする。
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// CE版では Dynamic Search は利用不可
export const DYNAMIC_SEARCH_AVAILABLE = false;

// CE版ではメタツールは空配列（Dynamic Search 無効）
export const DYNAMIC_SEARCH_META_TOOLS: Tool[] = [];

/** CE版では常に false を返すスタブ */
export const isMetaTool = (_name: string): boolean => false;

// MCP SDK の型を re-export
export type { Tool };

// Dynamic Search 固有の型定義（EE版との型互換性のため）
export type CallToolRequestParams = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type SearchToolsArgs = {
  query: string;
  limit?: number;
};

export type DescribeToolsArgs = {
  toolNames: string[];
};

export type SearchResult = {
  toolName: string;
  description: string | undefined;
  relevanceScore: number;
};

export type DescribeToolsResult = {
  toolName: string;
  description: string | undefined;
  inputSchema: Tool["inputSchema"] | Record<string, never>;
  found: boolean;
};
