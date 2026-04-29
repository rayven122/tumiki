// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * 動的ツール検索サービス
 *
 * mcp-proxy の searchTools.ee.ts から移植。
 * Vercel AI Gateway 経由で claude-3.5-haiku を使いセマンティック検索を行う。
 */

import { generateObject } from "ai";
import { z } from "zod";

import {
  gateway,
  TOOL_SEARCH_MODEL,
} from "../../infrastructure/ai/provider.js";
import { TIMEOUT_CONFIG } from "../../shared/constants/config.js";
import type { ToolSearchRequest, ToolSearchResponse } from "./schema.js";

const searchResultSchema = z.object({
  results: z.array(
    z.object({
      toolName: z.string().describe("ツール名"),
      relevanceScore: z.number().min(0).max(1).describe("関連度スコア（0-1）"),
    }),
  ),
});

export const searchTools = async (
  req: ToolSearchRequest,
): Promise<ToolSearchResponse["results"]> => {
  const { query, tools, limit } = req;

  if (tools.length === 0) {
    return [];
  }

  const toolDescriptions = tools
    .map((t) => `- ${t.name}: ${t.description ?? "説明なし"}`)
    .join("\n");

  const { object } = await generateObject({
    model: gateway(TOOL_SEARCH_MODEL),
    schema: searchResultSchema,
    abortSignal: AbortSignal.timeout(TIMEOUT_CONFIG.toolSearch),
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

  return object.results;
};
