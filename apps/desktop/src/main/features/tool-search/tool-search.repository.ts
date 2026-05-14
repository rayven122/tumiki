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
