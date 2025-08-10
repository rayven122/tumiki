import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";

type FindCustomServersInput = {
  ctx: ProtectedContext;
};

export const findCustomServers = async ({ ctx }: FindCustomServersInput) => {
  const customServers = await ctx.db.userMcpServerInstance.findMany({
    where: {
      serverType: ServerType.CUSTOM,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
    orderBy: {
      displayOrder: "asc",
    },
    include: {
      apiKeys: true,
      toolGroup: {
        include: {
          _count: {
            select: {
              toolGroupTools: true,
            },
          },
          toolGroupTools: {
            take: 1, // 1つだけ取得してmcpServerConfigIdを特定
            include: {
              userMcpServerConfig: {
                include: {
                  mcpServer: {
                    select: {
                      id: true,
                      name: true,
                      iconPath: true,
                      url: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const customServerList = customServers.map((server) => {
    const toolCount = server.toolGroup?._count?.toolGroupTools ?? 0;
    const mcpServer =
      server.toolGroup?.toolGroupTools?.[0]?.userMcpServerConfig?.mcpServer;

    return {
      ...server,
      tools: Array(toolCount).fill({}), // ツール数分の空オブジェクトを作成
      toolGroups: [],
      userMcpServers: [],
      mcpServer: mcpServer ?? null, // mcpServerデータを追加
    };
  });

  return customServerList;
};
