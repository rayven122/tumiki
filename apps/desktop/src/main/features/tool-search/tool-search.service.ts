import { cosineSimilarity, embedMany, gateway } from "ai";
import type { ToolSearchProvider } from "@tumiki/mcp-core-proxy";
import { getDb } from "../../shared/db";
import type { DbClient } from "../../shared/db";
import {
  findSearchableTools,
  updateServerDynamicSearch,
  type ToolSearchRow,
} from "./tool-search.repository";
import { simplifyToolSearchText } from "./search-text";

const DEFAULT_SEARCH_LIMIT = 10;
const DEFAULT_DYNAMIC_SEARCH_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_REQUEST_TIMEOUT_MS = 20_000;
const QUERY_EMBEDDING_TEXT_LIMIT = 500;
const TOOL_EMBEDDING_TEXT_LIMIT = 700;

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

const getDynamicSearchEmbeddingModel = (): string => {
  const model = process.env["DYNAMIC_SEARCH_EMBEDDING_MODEL"];
  return model && model.trim().length > 0
    ? model.trim()
    : DEFAULT_DYNAMIC_SEARCH_EMBEDDING_MODEL;
};

const getConfigName = (tool: ToolSearchRow): string => {
  // mcp-proxy.service.ts の buildConfigFromConnection と同じ短縮ルールを使う。
  // 不一致だと Dynamic Search 経路で proxy 側の config name と齟齬が出てツール呼び出しが失敗する。
  const isStandaloneConnection =
    tool.connection.server.serverType === "OFFICIAL" &&
    tool.connection.server.slug === tool.connection.slug;
  return isStandaloneConnection
    ? tool.connection.slug
    : `${tool.connection.server.slug}-${tool.connection.slug}`;
};

const getPrefixedToolName = (tool: ToolSearchRow): string =>
  `${getConfigName(tool)}__${tool.name}`;

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

  const candidates = tools.map((tool) => ({
    tool,
    text: sanitizeForEmbedding(
      simplifyToolSearchText(tool),
      TOOL_EMBEDDING_TEXT_LIMIT,
    ),
  }));
  const embedTexts = deps.embedTexts ?? embedTextsWithGateway;
  const embeddings = await embedTexts([
    sanitizeForEmbedding(query, QUERY_EMBEDDING_TEXT_LIMIT),
    ...candidates.map((candidate) => candidate.text),
  ]);
  const queryEmbedding = embeddings[0];
  if (!queryEmbedding) return [];

  return candidates
    .flatMap((candidate, index) => {
      const toolEmbedding = embeddings[index + 1];
      if (!toolEmbedding || toolEmbedding.length !== queryEmbedding.length) {
        return [];
      }
      const score = cosineSimilarity(queryEmbedding, toolEmbedding);
      if (score <= 0) return [];
      return [{ tool: candidate.tool, score, index }];
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((result) => toResult(result.tool, result.score));
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
