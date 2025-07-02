import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";

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
      apiKeys: true,
      toolGroup: {
        include: {
          toolGroupTools: {
            include: {
              tool: true,
              userMcpServerConfig: {
                include: {
                  mcpServer: true,
                  tools: true,
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
      mcpServerInstanceToolGroups: {
        include: {
          toolGroup: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const customServerList = customServers.map((server) => {
    const userMcpServers = server.toolGroup.toolGroupTools
      .map(({ userMcpServerConfig }) => userMcpServerConfig)
      .map((userMcpServerConfig) => ({
        ...userMcpServerConfig.mcpServer,
        id: userMcpServerConfig.id,
        name: userMcpServerConfig.name,
        createdAt: userMcpServerConfig.createdAt,
        updatedAt: userMcpServerConfig.updatedAt,
        tools: userMcpServerConfig.tools,
        apiKeys: server.apiKeys,
      }));

    const tools = server.toolGroup.toolGroupTools.map(
      ({ tool, userMcpServerConfigId }) => ({ ...tool, userMcpServerConfigId }),
    );

    const toolGroups = server.mcpServerInstanceToolGroups.map(
      ({ toolGroup }) => toolGroup,
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
