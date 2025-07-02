import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";
import { convertToSortOrder } from "@tumiki/utils";
import type { UserMcpServerConfigId } from "@/schema/ids";

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
            },
          },
        },
      },
      mcpServerInstanceToolGroups: {
        include: { toolGroup: true },
      },
    },
  });
  const userMcpServerConfigIds = new Set<UserMcpServerConfigId>();
  customServers.forEach((server) => {
    server.toolGroup.toolGroupTools.forEach(({ userMcpServerConfigId }) => {
      userMcpServerConfigIds.add(
        userMcpServerConfigId as UserMcpServerConfigId,
      );
    });
  });

  const userMcpServerConfigs = await ctx.db.userMcpServerConfig.findMany({
    where: {
      id: {
        in: [...userMcpServerConfigIds],
      },
    },
    include: {
      mcpServer: true,
      tools: true,
    },
  });

  const customServerList = customServers.map((server) => {
    const userMcpServers = userMcpServerConfigs.map((userMcpServerConfig) => {
      return {
        ...userMcpServerConfig.mcpServer,
        id: userMcpServerConfig.id,
        name: userMcpServerConfig.name,
        createdAt: userMcpServerConfig.createdAt,
        updatedAt: userMcpServerConfig.updatedAt,
        tools: userMcpServerConfig.tools,
        apiKeys: server.apiKeys,
      };
    });

    const tools = convertToSortOrder(server.toolGroup.toolGroupTools).map(
      ({ tool, userMcpServerConfigId }) => ({ ...tool, userMcpServerConfigId }),
    );
    const toolGroups = convertToSortOrder(
      server.mcpServerInstanceToolGroups,
    ).map(({ toolGroup }) => toolGroup);

    return {
      ...server,
      tools,
      toolGroups,
      userMcpServers,
    };
  });

  return customServerList;
};