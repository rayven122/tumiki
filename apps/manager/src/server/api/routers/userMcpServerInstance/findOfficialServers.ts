import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";

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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const officialServerList = officialServers.map((server) => {
    // 最初のtoolGroupToolからuserMcpServerConfigを取得
    const firstToolGroupTool = server.toolGroup.toolGroupTools[0];
    if (!firstToolGroupTool?.userMcpServerConfig) {
      throw new Error("userMcpServerConfig not found");
    }

    const serverConfig = firstToolGroupTool.userMcpServerConfig;

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

    const tools = server.toolGroup.toolGroupTools.map(
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
