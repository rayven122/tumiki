import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";

import { convertToSortOrder } from "@tumiki/utils";
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
    },
  });

  // toolGroupTool の ユニークな userMcpServerConfigId を取得して、その userMcpServerConfig を取得する
  const userMcpServerConfigIds = officialServers
    .filter((server) => server.toolGroup?.toolGroupTools?.length > 0)
    .map((server) => {
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
      tools: true,
    },
  });

  const officialServerList = officialServers.map((server) => {
    // toolGroupTools が空の場合は、空の配列を返す
    if (!server.toolGroup?.toolGroupTools?.length) {
      return {
        ...server,
        iconPath: server.iconPath,
        tools: [],
        toolGroups: [],
        userMcpServers: [],
      };
    }

    const userMcpServerConfigId = server.toolGroup.toolGroupTools[0]?.userMcpServerConfigId;
    const serverConfig = userMcpServerConfigs.find(config => config.id === userMcpServerConfigId);
    
    if (!serverConfig) {
      throw new Error("mcpServerConfig not found");
    }

    const userMcpServers = [
      {
        ...serverConfig.mcpServer,
        id: serverConfig.id,
        name: serverConfig.name,
        createdAt: serverConfig.createdAt,
        updatedAt: serverConfig.updatedAt,
        tools: serverConfig.tools,
        apiKeys: server.apiKeys,
      },
    ];

    const tools = convertToSortOrder(server.toolGroup.toolGroupTools).map(
      ({ tool, userMcpServerConfigId }) => ({ ...tool, userMcpServerConfigId }),
    );

    return {
      ...server,
      iconPath: server.iconPath ?? serverConfig.mcpServer.iconPath,
      tools,
      toolGroups: [],
      userMcpServers,
    };
  });

  return officialServerList;
};
