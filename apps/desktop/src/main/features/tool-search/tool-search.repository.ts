import type { Prisma } from "@prisma/desktop-client";
import type { DbClient } from "../../shared/db";

const toolSearchSelect = {
  id: true,
  name: true,
  description: true,
  inputSchema: true,
  customName: true,
  customDescription: true,
  isAllowed: true,
  connection: {
    select: {
      id: true,
      name: true,
      slug: true,
      catalogId: true,
      server: {
        select: {
          id: true,
          name: true,
          slug: true,
          serverType: true,
          dynamicSearch: true,
        },
      },
    },
  },
} satisfies Prisma.McpToolSelect;

export type ToolSearchRow = Prisma.McpToolGetPayload<{
  select: typeof toolSearchSelect;
}>;

export type ToolEmbeddingCacheRow = {
  toolId: number;
  modelId: string;
  textVersion: number;
  dim: number;
  contentHash: string;
  vector: Uint8Array<ArrayBuffer>;
};

export const findSearchableTools = async (
  db: DbClient,
  input: { serverId?: number; dynamicSearchOnly?: boolean } = {},
): Promise<ToolSearchRow[]> => {
  return db.mcpTool.findMany({
    where: {
      isAllowed: true,
      connection: {
        isEnabled: true,
        server: {
          isEnabled: true,
          ...(input.serverId ? { id: input.serverId } : {}),
          ...(input.dynamicSearchOnly ? { dynamicSearch: true } : {}),
        },
      },
    },
    select: toolSearchSelect,
    orderBy: { id: "asc" },
  });
};

export const updateServerDynamicSearch = async (
  db: DbClient,
  serverId: number,
  enabled: boolean,
) => {
  return db.mcpServer.update({
    where: { id: serverId },
    data: { dynamicSearch: enabled },
  });
};

export const findToolEmbeddingCaches = async (
  db: DbClient,
  input: { toolIds: number[]; modelId: string; textVersion: number },
): Promise<ToolEmbeddingCacheRow[]> => {
  if (input.toolIds.length === 0) return [];

  return db.mcpToolEmbeddingCache.findMany({
    where: {
      toolId: { in: input.toolIds },
      modelId: input.modelId,
      textVersion: input.textVersion,
    },
    select: {
      toolId: true,
      modelId: true,
      textVersion: true,
      dim: true,
      contentHash: true,
      vector: true,
    },
  });
};

export const upsertToolEmbeddingCaches = async (
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

  for (const item of input.items) {
    await db.mcpToolEmbeddingCache.upsert({
      where: {
        toolId_modelId_textVersion: {
          toolId: item.toolId,
          modelId: input.modelId,
          textVersion: input.textVersion,
        },
      },
      update: {
        contentHash: item.contentHash,
        dim: item.dim,
        vector: item.vector,
      },
      create: {
        toolId: item.toolId,
        modelId: input.modelId,
        textVersion: input.textVersion,
        contentHash: item.contentHash,
        dim: item.dim,
        vector: item.vector,
      },
    });
  }
};
