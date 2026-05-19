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

const embeddingCacheSelect = {
  toolId: true,
  dim: true,
  contentHash: true,
  // modelId/textVersionはWHERE条件で固定し、row側では参照しない
  vector: true,
} satisfies Prisma.McpToolEmbeddingCacheSelect;

export type ToolSearchRow = Prisma.McpToolGetPayload<{
  select: typeof toolSearchSelect;
}>;

export type ToolEmbeddingCacheRow = Prisma.McpToolEmbeddingCacheGetPayload<{
  select: typeof embeddingCacheSelect;
}>;

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
    select: embeddingCacheSelect,
    orderBy: { id: "asc" },
  });
};

export const deleteStaleToolEmbeddingCaches = async (
  db: DbClient,
  input: { modelId: string; textVersion: number },
): Promise<void> => {
  // モデルや検索テキストversionを切り替えた後の補助cleanup。cache保存後のbest-effortとして扱う
  await db.mcpToolEmbeddingCache.deleteMany({
    where: {
      OR: [
        { modelId: { not: input.modelId } },
        { textVersion: { not: input.textVersion } },
      ],
    },
  });
};

const upsertToolEmbeddingCache = async (
  db: DbClient,
  input: {
    modelId: string;
    textVersion: number;
    item: {
      toolId: number;
      contentHash: string;
      dim: number;
      vector: Uint8Array<ArrayBuffer>;
    };
  },
): Promise<void> => {
  await db.mcpToolEmbeddingCache.upsert({
    where: {
      toolId_modelId_textVersion: {
        toolId: input.item.toolId,
        modelId: input.modelId,
        textVersion: input.textVersion,
      },
    },
    update: {
      contentHash: input.item.contentHash,
      dim: input.item.dim,
      vector: input.item.vector,
    },
    create: {
      toolId: input.item.toolId,
      modelId: input.modelId,
      textVersion: input.textVersion,
      contentHash: input.item.contentHash,
      dim: input.item.dim,
      vector: input.item.vector,
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
    await upsertToolEmbeddingCache(db, {
      modelId: input.modelId,
      textVersion: input.textVersion,
      item,
    });
  }
};
