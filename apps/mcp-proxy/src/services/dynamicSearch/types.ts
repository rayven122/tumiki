/**
 * Dynamic Search 機能の型定義
 *
 * MCP SDK の Tool 型と CallToolRequestParams 型を re-export し、
 * Dynamic Search 固有の型を定義
 */

import type {
  Tool,
  CallToolRequestParams,
} from "@modelcontextprotocol/sdk/types.js";

// MCP SDK の型を re-export
export type { Tool, CallToolRequestParams };

/**
 * search_tools の引数
 * Dynamic Search 固有の機能（MCP 標準にはツール検索機能がない）
 */
export type SearchToolsArgs = {
  /** 検索クエリ（自然言語でツールを検索） */
  query: string;
  /** 返す結果の最大数（デフォルト: 10） */
  limit?: number;
};

/**
 * describe_tools の引数
 * Dynamic Search 固有の機能（MCP 標準では tools/list で全ツール取得）
 */
export type DescribeToolsArgs = {
  /** スキーマを取得するツール名の配列 */
  toolNames: string[];
};

/**
 * 検索結果
 * Dynamic Search 固有の機能（AI検索による関連度スコアを含む）
 */
export type SearchResult = {
  /** ツール名 */
  toolName: string;
  /** ツールの説明 */
  description: string | undefined;
  /** 関連度スコア（0-1） */
  relevanceScore: number;
};
