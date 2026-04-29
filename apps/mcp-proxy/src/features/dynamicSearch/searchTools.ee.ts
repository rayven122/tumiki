// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * search_tools メタツール実装
 *
 * Tumiki Cloud API（/v1/tool-search）に委譲してセマンティック検索を行う
 */

import { toError } from "../../shared/errors/toError.js";
import { logError, logInfo } from "../../shared/logger/index.js";
import type { SearchToolsArgs, SearchResult, Tool } from "./types.ee.js";

type CloudApiSearchResult = {
  toolName: string;
  relevanceScore: number;
};

type CloudApiResponse = {
  results: CloudApiSearchResult[];
};

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

  logInfo("Executing search_tools via Tumiki Cloud API", {
    query,
    limit,
    totalTools: internalTools.length,
  });

  if (internalTools.length === 0) {
    logInfo("No tools available for search");
    return [];
  }

  const cloudApiUrl = process.env.TUMIKI_CLOUD_API_URL;
  const cloudApiToken = process.env.TUMIKI_CLOUD_API_TOKEN;

  if (!cloudApiUrl) {
    throw new Error("TUMIKI_CLOUD_API_URL is not configured");
  }

  if (!cloudApiToken) {
    throw new Error("TUMIKI_CLOUD_API_TOKEN is not configured");
  }

  const tools = internalTools.map((t) => ({
    name: t.name,
    description: t.description,
  }));

  try {
    const response = await fetch(`${cloudApiUrl}/v1/tool-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cloudApiToken}`,
      },
      body: JSON.stringify({ query, tools, limit }),
    });

    if (!response.ok) {
      throw new Error(
        `Tumiki Cloud API responded with status ${response.status}`,
      );
    }

    const data = (await response.json()) as CloudApiResponse;

    // 検索結果に説明文を付与して返す
    const results: SearchResult[] = data.results.map((result) => {
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
    logError(
      "Failed to execute search_tools via Tumiki Cloud API",
      toError(error),
      {
        query,
        limit,
      },
    );
    throw error;
  }
};
