// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * search_tools メタツール実装
 *
 * claude-3-5-haiku を使用してセマンティック検索を行い、
 * クエリに関連するツールを返す
 */

import { generateObject } from "ai";
import { z } from "zod";

import { gateway, DYNAMIC_SEARCH_MODEL } from "../../libs/ai/index.js";
import { toError } from "../../libs/error/index.js";
import { logError, logInfo } from "../../libs/logger/index.js";
import type { SearchToolsArgs, SearchResult, Tool } from "./types.ee.js";

/**
 * 検索結果のスキーマ
 */
const searchResultSchema = z.object({
  results: z.array(
    z.object({
      toolName: z.string().describe("ツール名"),
      relevanceScore: z.number().min(0).max(1).describe("関連度スコア（0-1）"),
    }),
  ),
});

/**
 * search_tools を実行
 *
 * @param args - 検索引数
 * @param internalTools - 内部ツールリスト（dynamicSearchが有効でも全ツール）
 * @returns 検索結果
 */
export const searchTools = async (
  args: SearchToolsArgs,
  internalTools: Tool[],
): Promise<SearchResult[]> => {
  const { query, limit = 10 } = args;

  logInfo("Executing search_tools", {
    query,
    limit,
    totalTools: internalTools.length,
  });

  // ツールが0件の場合は空配列を返す
  if (internalTools.length === 0) {
    logInfo("No tools available for search");
    return [];
  }

  // ツールリストの説明を生成
  const toolDescriptions = internalTools
    .map((tool) => `- ${tool.name}: ${tool.description ?? "説明なし"}`)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: gateway(DYNAMIC_SEARCH_MODEL),
      schema: searchResultSchema,
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

    // 関連度スコアとともに結果を返す（AI SDK v6は型を自動推論）
    const results: SearchResult[] = object.results.map((result) => {
      const tool = internalTools.find((t) => t.name === result.toolName);
      return {
        toolName: result.toolName,
        description: tool?.description,
        relevanceScore: result.relevanceScore,
      };
    });

    logInfo("search_tools completed", {
      query,
      resultCount: results.length,
    });

    return results;
  } catch (error) {
    logError("Failed to execute search_tools", toError(error), {
      query,
      limit,
    });
    throw error;
  }
};
