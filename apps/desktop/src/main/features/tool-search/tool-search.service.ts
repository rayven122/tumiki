import { createHash } from "node:crypto";
import { embedMany, gateway } from "ai";
import type { ToolSearchProvider } from "@tumiki/mcp-core-proxy";
import { getDb } from "../../shared/db";
import type { DbClient } from "../../shared/db";
import {
  deleteStaleToolEmbeddingCaches,
  findToolEmbeddingCaches,
  findSearchableTools,
  updateServerDynamicSearch,
  upsertToolEmbeddingCaches,
  type ToolSearchRow,
} from "./tool-search.repository";
import { simplifyToolSearchText } from "./search-text";
import { buildMcpConfigName } from "../../shared/utils/config-name";
import * as logger from "../../shared/utils/logger";

const DEFAULT_SEARCH_LIMIT = 10;
const DEFAULT_DYNAMIC_SEARCH_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_REQUEST_TIMEOUT_MS = 20_000;
const QUERY_EMBEDDING_TEXT_LIMIT = 500;
const TOOL_EMBEDDING_TEXT_LIMIT = 700;
// simplifyToolSearchTextを変更した場合は既存キャッシュを無効化するためにこの値を上げる
const TOOL_EMBEDDING_TEXT_VERSION = 1;

export type ToolSearchResult = {
  toolId: number;
  toolName: string;
  displayName: string;
  description: string;
  inputSchema: string;
  connectionId: number;
  connectionName: string;
  connectionSlug: string;
  serverId: number;
  serverName: string;
  serverSlug: string;
  score: number;
};

export type SearchToolsInput = {
  query: string;
  limit?: number;
  serverId?: number;
  dynamicSearchOnly?: boolean;
};

type ToolSearchDeps = {
  db?: DbClient;
  embedTexts?: (values: string[]) => Promise<number[][]>;
};

const resolveLimit = (limit: number | undefined): number =>
  Math.max(0, Math.floor(limit ?? DEFAULT_SEARCH_LIMIT));

const sanitizeForEmbedding = (input: string, maxLength: number): string => {
  return input
    .replace(/[`$\\]/g, " ")
    .replace(/\r\n|\r|\n/g, " ")
    .slice(0, maxLength);
};

const hashEmbeddingText = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const embeddingToBytes = (embedding: number[]): Uint8Array<ArrayBuffer> => {
  const vector = new Float32Array(embedding);
  return new Uint8Array(vector.buffer);
};

const bytesToEmbedding = (
  bytes: Uint8Array,
  dim: number,
): Float32Array | undefined => {
  if (dim <= 0 || bytes.byteLength !== dim * Float32Array.BYTES_PER_ELEMENT) {
    return undefined;
  }
  // PrismaのBytesはBuffer由来でbyteOffsetが0とは限らないため、該当範囲だけを切り出す
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return new Float32Array(buffer);
};

// キャッシュ復元値のFloat32Arrayにも対応するため、ArrayLike<number>で計算する
const cosineSimilarity = (
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number => {
  if (left.length === 0 || left.length !== right.length) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

const getDynamicSearchEmbeddingModel = (): string => {
  const model = process.env["DYNAMIC_SEARCH_EMBEDDING_MODEL"];
  return model && model.trim().length > 0
    ? model.trim()
    : DEFAULT_DYNAMIC_SEARCH_EMBEDDING_MODEL;
};

const getPrefixedToolName = (tool: ToolSearchRow): string =>
  `${buildMcpConfigName(tool.connection)}__${tool.name}`;

const toResult = (tool: ToolSearchRow, score: number): ToolSearchResult => ({
  toolId: tool.id,
  toolName: getPrefixedToolName(tool),
  displayName: tool.customName ?? tool.name,
  description: tool.customDescription ?? tool.description,
  inputSchema: tool.inputSchema,
  connectionId: tool.connection.id,
  connectionName: tool.connection.name,
  connectionSlug: tool.connection.slug,
  serverId: tool.connection.server.id,
  serverName: tool.connection.server.name,
  serverSlug: tool.connection.server.slug,
  score,
});

const parseInputSchema = (inputSchema: string): unknown => {
  try {
    return JSON.parse(inputSchema);
  } catch {
    return {};
  }
};

const embedTextsWithGateway = async (values: string[]): Promise<number[][]> => {
  const { embeddings } = await embedMany({
    model: gateway.embeddingModel(getDynamicSearchEmbeddingModel()),
    values,
    abortSignal: AbortSignal.timeout(EMBEDDING_REQUEST_TIMEOUT_MS),
  });

  return embeddings;
};

const persistEmbeddingCacheUpdates = async (
  db: DbClient,
  input: {
    modelId: string;
    textVersion: number;
    items: Array<{
      toolId: number;
      contentHash: string;
      dim: number;
      vector: Uint8Array<ArrayBuffer>;
    }>;
  },
): Promise<void> => {
  if (input.items.length === 0) return;

  await upsertToolEmbeddingCaches(db, input);
  await deleteStaleToolEmbeddingCaches(db, {
    modelId: input.modelId,
    textVersion: input.textVersion,
  });
};

export const setDynamicSearchEnabled = async (
  serverId: number,
  enabled: boolean,
  deps: Pick<ToolSearchDeps, "db"> = {},
) => {
  const db = deps.db ?? (await getDb());
  return updateServerDynamicSearch(db, serverId, enabled);
};

export const searchTools = async (
  input: SearchToolsInput,
  deps: ToolSearchDeps = {},
): Promise<ToolSearchResult[]> => {
  const limit = resolveLimit(input.limit);
  if (limit === 0) return [];

  const query = input.query.trim();
  if (query.length === 0) return [];

  const db = deps.db ?? (await getDb());
  const tools = await findSearchableTools(db, {
    serverId: input.serverId,
    dynamicSearchOnly: input.dynamicSearchOnly,
  });
  if (tools.length === 0) return [];

  const candidates = tools.map((tool, index) => ({
    tool,
    text: sanitizeForEmbedding(
      simplifyToolSearchText(tool),
      TOOL_EMBEDDING_TEXT_LIMIT,
    ),
    index,
  }));

  const modelId = getDynamicSearchEmbeddingModel();
  // Desktopの想定規模は約1kツールのため、検索ごとにBLOBを読む単純な構成で常駐メモリを抑える
  const cacheRows = await findToolEmbeddingCaches(db, {
    toolIds: candidates.map((candidate) => candidate.tool.id),
    modelId,
    textVersion: TOOL_EMBEDDING_TEXT_VERSION,
  });
  const cacheByToolId = new Map(
    cacheRows.map((cache) => [cache.toolId, cache] as const),
  );
  const candidatesWithCache = candidates.map((candidate) => {
    const contentHash = hashEmbeddingText(candidate.text);
    const cache = cacheByToolId.get(candidate.tool.id);
    const cachedEmbedding =
      cache?.contentHash === contentHash
        ? bytesToEmbedding(cache.vector, cache.dim)
        : undefined;
    return { ...candidate, contentHash, cachedEmbedding };
  });
  const cacheMisses = candidatesWithCache.filter(
    (candidate) => candidate.cachedEmbedding === undefined,
  );

  const embedTexts = deps.embedTexts ?? embedTextsWithGateway;
  const embeddings = await embedTexts([
    sanitizeForEmbedding(query, QUERY_EMBEDDING_TEXT_LIMIT),
    ...cacheMisses.map((candidate) => candidate.text),
  ]);
  const queryEmbedding = embeddings[0];
  if (!queryEmbedding) return [];

  const embeddingByToolId = new Map<number, ArrayLike<number>>();
  const cacheWrites: Array<{
    toolId: number;
    contentHash: string;
    dim: number;
    vector: Uint8Array<ArrayBuffer>;
  }> = [];

  candidatesWithCache.forEach((candidate) => {
    if (
      candidate.cachedEmbedding &&
      candidate.cachedEmbedding.length === queryEmbedding.length
    ) {
      embeddingByToolId.set(candidate.tool.id, candidate.cachedEmbedding);
    }
  });

  cacheMisses.forEach((candidate, index) => {
    const embedding = embeddings[index + 1];
    if (!embedding || embedding.length !== queryEmbedding.length) return;

    embeddingByToolId.set(candidate.tool.id, embedding);
    cacheWrites.push({
      toolId: candidate.tool.id,
      contentHash: candidate.contentHash,
      dim: embedding.length,
      vector: embeddingToBytes(embedding),
    });
  });

  const dimMismatchedCacheHits = candidatesWithCache.filter(
    (candidate) =>
      candidate.cachedEmbedding !== undefined &&
      candidate.cachedEmbedding.length !== queryEmbedding.length,
  );
  if (dimMismatchedCacheHits.length > 0) {
    // 次元不一致はembeddingモデルの変更時だけ発生する想定なので、レアケースとして直列再取得する
    const refreshedEmbeddings = await embedTexts(
      dimMismatchedCacheHits.map((candidate) => candidate.text),
    );
    dimMismatchedCacheHits.forEach((candidate, index) => {
      const embedding = refreshedEmbeddings[index];
      if (!embedding || embedding.length !== queryEmbedding.length) return;

      embeddingByToolId.set(candidate.tool.id, embedding);
      cacheWrites.push({
        toolId: candidate.tool.id,
        contentHash: candidate.contentHash,
        dim: embedding.length,
        vector: embeddingToBytes(embedding),
      });
    });
  }

  const results = candidatesWithCache
    .flatMap((candidate) => {
      const toolEmbedding = embeddingByToolId.get(candidate.tool.id);
      if (!toolEmbedding) {
        return [];
      }
      const score = cosineSimilarity(queryEmbedding, toolEmbedding);
      if (score <= 0) return [];
      return [{ tool: candidate.tool, score, index: candidate.index }];
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((result) => toResult(result.tool, result.score));

  // キャッシュ保存は検索品質に影響しないため、失敗しても結果は返す
  void persistEmbeddingCacheUpdates(db, {
    modelId,
    textVersion: TOOL_EMBEDDING_TEXT_VERSION,
    items: cacheWrites,
  }).catch((error: unknown) => {
    logger.warn("動的検索embeddingキャッシュの保存に失敗しました", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return results;
};

export const createDesktopToolSearchProvider = (input: {
  serverId?: number;
  db?: DbClient;
}): ToolSearchProvider => ({
  searchTools: async ({ query, limit }) => {
    const results = await searchTools(
      {
        query,
        limit,
        serverId: input.serverId,
        dynamicSearchOnly: input.serverId === undefined,
      },
      input.db ? { db: input.db } : {},
    );
    return results.map((result) => ({
      toolName: result.toolName,
      description: result.description,
      relevanceScore: result.score,
    }));
  },
  describeTools: async ({ toolNames }) => {
    const db = input.db ?? (await getDb());
    const tools = await findSearchableTools(db, {
      serverId: input.serverId,
      dynamicSearchOnly: input.serverId === undefined,
    });
    const byName = new Map(
      tools.map((tool) => [getPrefixedToolName(tool), tool] as const),
    );

    return toolNames.map((toolName) => {
      const tool = byName.get(toolName);
      if (!tool) {
        return {
          toolName,
          found: false,
          inputSchema: {},
        };
      }

      return {
        toolName,
        description: tool.customDescription ?? tool.description,
        inputSchema: parseInputSchema(tool.inputSchema),
        found: true,
      };
    });
  },
});
