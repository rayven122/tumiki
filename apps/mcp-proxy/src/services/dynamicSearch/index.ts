/**
 * Dynamic Search サービス (CE Facade)
 *
 * Community Edition ではDynamic Search機能が無効。
 * CE版でも型安全性を維持するため、型のみエクスポートする。
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// CE版ではDynamic Searchは利用不可
export const DYNAMIC_SEARCH_AVAILABLE = false;

// CE版ではメタツールは空配列
export const DYNAMIC_SEARCH_META_TOOLS: Tool[] = [];

/**
 * 指定された名前がメタツールかどうかを判定 (CE stub)
 * CE版では常に false を返す
 */
export const isMetaTool = (_name: string): boolean => false;

/**
 * CE版では型のみエクスポート
 * MCP SDK の型を re-export
 */
export type { Tool };

// Dynamic Search 固有の型定義（CE版でも型互換性のため定義）
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
