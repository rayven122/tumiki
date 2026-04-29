// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";

export const toolSearchRequestSchema = z.object({
  query: z.string().min(1),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
    }),
  ),
  limit: z.number().int().positive().max(50).default(10),
});

export const toolSearchResponseSchema = z.object({
  results: z.array(
    z.object({
      toolName: z.string(),
      relevanceScore: z.number().min(0).max(1),
    }),
  ),
});

export type ToolSearchRequest = z.infer<typeof toolSearchRequestSchema>;
export type ToolSearchResponse = z.infer<typeof toolSearchResponseSchema>;
