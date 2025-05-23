import { ServerType } from "@prisma/client";
import type { ProtectedContext } from "../../trpc";

import { convertToSortOrder } from "@/utils/server/converter";

type FindOfficialServersInput = {
  ctx: ProtectedContext;
};

export const findOfficialServers = async ({
  ctx,
}: FindOfficialServersInput) => {
  const officialServers = await ctx.db.userMcpServerInstance.findMany({
    where: {
      serverType: ServerType.OFFICIAL,
      userId: ctx.session.user.id,
    },
    include: {
      mcpServerConfigs: {
        // ServerType.OFFICIAL の mcpServerConfigs は1つしか存在しない
        take: 1,
        include: { mcpServer: true },
      },
      toolGroup: {
        include: {
          toolGroupTools: {
            include: { tool: true },
          },
        },
      },
    },
  });

  const officialServerList = officialServers.map((server) => {
    const serverConfig = server.mcpServerConfigs[0];
    if (!serverConfig) {
      throw new Error("mcpServerConfig not found");
    }

    const userMcpServer = {
      ...serverConfig.mcpServer,
      name: server.name ?? serverConfig.mcpServer.name,
      iconPath: server.iconPath ?? serverConfig.mcpServer.iconPath,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    };

    const tools = convertToSortOrder(server.toolGroup.toolGroupTools, "tool");
    return {
      ...server,
      tools,
      userMcpServer,
    };
  });

  return officialServerList;
};
