import { ServerType } from "@prisma/client";
import type { ProtectedContext } from "../../trpc";
import { convertToSortOrder } from "@/utils/server/converter";

type FindCustomServersInput = {
  ctx: ProtectedContext;
};

export const findCustomServers = async ({ ctx }: FindCustomServersInput) => {
  const customServers = await ctx.db.userMcpServerInstance.findMany({
    where: {
      serverType: ServerType.CUSTOM,
      userId: ctx.session.user.id,
    },
    include: {
      mcpServerConfigs: {
        include: { mcpServer: true },
      },
      toolGroup: {
        include: {
          toolGroupTools: {
            include: { tool: true },
          },
        },
      },
      mcpServerInstanceToolGroups: {
        include: { toolGroup: true },
      },
    },
  });

  const customServerList = customServers.map((server) => {
    const userMcpServers = server.mcpServerConfigs.map((serverConfig) => {
      return {
        ...serverConfig.mcpServer,
        id: serverConfig.id,
        name: server.name ?? serverConfig.mcpServer.name,
        createdAt: serverConfig.createdAt,
        updatedAt: serverConfig.updatedAt,
      };
    });

    const tools = convertToSortOrder(server.toolGroup.toolGroupTools, "tool");
    const toolGroups = convertToSortOrder(
      server.mcpServerInstanceToolGroups,
      "toolGroup",
    );

    return {
      ...server,
      tools,
      toolGroups,
      userMcpServers,
    };
  });

  return customServerList;
};
