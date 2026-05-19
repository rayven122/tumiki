// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";

import { TOOL_SEARCH_EMBEDDING_CONFIG } from "../../shared/constants/config.js";

export const toolSearchEmbeddingsRequestSchema = z.object({
  texts: z
    .array(
      z.string().trim().min(1).max(TOOL_SEARCH_EMBEDDING_CONFIG.maxTextLength),
    )
    .min(1)
    .max(TOOL_SEARCH_EMBEDDING_CONFIG.maxTextsPerRequest),
});

export type ToolSearchEmbeddingsRequest = z.infer<
  typeof toolSearchEmbeddingsRequestSchema
>;

export type ToolSearchEmbeddingsResponse = {
  model: string;
  embeddings: number[][];
};
