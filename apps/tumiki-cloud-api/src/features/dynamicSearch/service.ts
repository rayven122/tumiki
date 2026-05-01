// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Dynamic Search サービス
 *
 * Vercel AI Gateway 経由で LLM を呼び出し、ツールリストから
 * クエリに関連するツールを返す
 */

import { generateObject } from "ai";
import { gateway } from "ai";
import { z } from "zod";

import {
  DYNAMIC_SEARCH_CONFIG,
  TIMEOUT_CONFIG,
} from "../../shared/constants/config.js";
import type { SearchRequest, SearchResponse, SearchResult } from "./schema.js";

const llmResultSchema = z.object({
  results: z.array(
    z.object({
      toolName: z.string(),
      relevanceScore: z.number().min(0).max(1),
    }),
  ),
});

/**
 * search_tools を実行
 */
export const searchTools = async (
  request: SearchRequest,
): Promise<SearchResponse> => {
  const { query, tools, limit = DYNAMIC_SEARCH_CONFIG.defaultLimit } = request;

  if (tools.length === 0) {
    return { results: [] };
  }

  const model =
    process.env.DYNAMIC_SEARCH_MODEL ?? DYNAMIC_SEARCH_CONFIG.defaultModel;

  const toolDescriptions = tools
    .map((tool) => `- ${tool.name}: ${tool.description ?? "説明なし"}`)
    .join("\n");

  const { object } = await generateObject({
    model: gateway(model),
    schema: llmResultSchema,
    abortSignal: AbortSignal.timeout(TIMEOUT_CONFIG.llmRequest),
    prompt: `以下のツールリストから、ユーザーのクエリに関連するツールを選んでください。

クエリ: "${query}"

利用可能なツール:
${toolDescriptions}

指示:
- クエリに最も関連するツールを最大${limit}件選んでください
- 各ツールに対して、クエリとの関連度スコア（0-1）を付けてください
- 関連度スコアが高い順に並べてください
- 全く関連がないツールは含めないでください
- ツール名は完全に一致させてください（変更しないでください）`,
  });

  const results: SearchResult[] = object.results.map((result) => {
    const tool = tools.find((t) => t.name === result.toolName);
    return {
      toolName: result.toolName,
      description: tool?.description,
      relevanceScore: result.relevanceScore,
    };
  });

  return { results };
};
