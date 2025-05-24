import { ServerType } from "@prisma/client";
import type { ProtectedContext } from "../../trpc";

import { convertToSortOrder } from "@/utils/server/converter";
import type { UserMcpServerConfigId } from "@/schema/ids";

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
      toolGroup: {
        include: {
          toolGroupTools: {
            include: {
              tool: true,
            },
          },
        },
      },
    },
  });

  // toolGroupTool の ユニークな userMcpServerConfigId を取得して、その userMcpServerConfig を取得する
  const userMcpServerConfigIds = officialServers.map((server) => {
    const userMcpServerConfigId =
      server.toolGroup.toolGroupTools[0]?.userMcpServerConfigId;
    if (!userMcpServerConfigId) {
      throw new Error("userMcpServerConfigId not found");
    }
    return userMcpServerConfigId;
  }) as UserMcpServerConfigId[];

  const userMcpServerConfigs = await ctx.db.userMcpServerConfig.findMany({
    where: {
      id: {
        in: userMcpServerConfigIds,
      },
    },
    include: {
      mcpServer: true,
      userToolGroupTools: true,
    },
  });

  const officialServerList = officialServers.map((server, i) => {
    const serverConfig = userMcpServerConfigs[i];
    if (!serverConfig) {
      throw new Error("mcpServerConfig not found");
    }

    const tools = convertToSortOrder(server.toolGroup.toolGroupTools, "tool");
    return {
      ...server,
      tools,
      iconPath: server.iconPath ?? serverConfig.mcpServer.iconPath,
    };
  });

  return officialServerList;
};
