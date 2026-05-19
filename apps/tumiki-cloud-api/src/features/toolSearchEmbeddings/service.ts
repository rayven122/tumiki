// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { embedMany, gateway } from "ai";

import {
  TIMEOUT_CONFIG,
  TOOL_SEARCH_EMBEDDING_CONFIG,
} from "../../shared/constants/config.js";
import type {
  ToolSearchEmbeddingsRequest,
  ToolSearchEmbeddingsResponse,
} from "./schema.js";

export class GatewayNotConfiguredError extends Error {
  constructor() {
    super("AI_GATEWAY_API_KEY is not configured");
    this.name = "GatewayNotConfiguredError";
  }
}

const getEmbeddingModel = (): string => {
  const model = process.env.DYNAMIC_SEARCH_EMBEDDING_MODEL?.trim();
  return model && model.length > 0
    ? model
    : TOOL_SEARCH_EMBEDDING_CONFIG.defaultModel;
};

const assertAiGatewayConfigured = (): void => {
  if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
    throw new GatewayNotConfiguredError();
  }
};

export const embedToolSearchTexts = async (
  request: ToolSearchEmbeddingsRequest,
): Promise<ToolSearchEmbeddingsResponse> => {
  assertAiGatewayConfigured();

  const model = getEmbeddingModel();
  const { embeddings } = await embedMany({
    model: gateway.embeddingModel(model),
    values: request.texts,
    abortSignal: AbortSignal.timeout(TIMEOUT_CONFIG.llmRequest),
  });

  return { model, embeddings };
};
