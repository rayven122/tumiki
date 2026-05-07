// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";

import { DYNAMIC_SEARCH_CONFIG } from "../../shared/constants/config.js";

/**
 * 検索対象ツールの定義
 */
export const toolDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export type ToolDefinition = z.infer<typeof toolDefinitionSchema>;

/**
 * search_tools リクエストスキーマ
 */
export const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  tools: z
    .array(toolDefinitionSchema)
    .min(1)
    .max(DYNAMIC_SEARCH_CONFIG.maxToolsPerRequest),
  limit: z
    .number()
    .int()
    .positive()
    .max(DYNAMIC_SEARCH_CONFIG.maxLimit)
    .optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

/**
 * 検索結果の 1 件
 */
export type SearchResult = {
  toolName: string;
  description?: string;
  relevanceScore: number;
};

/**
 * search_tools レスポンス
 */
export type SearchResponse = {
  results: SearchResult[];
};
