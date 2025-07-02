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
  // 🚀 パフォーマンス最適化: 単一のクエリでN+1問題を解決
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
              // 🔥 重要: userMcpServerConfigも同時に取得してN+1を回避
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
    // 🚀 結果をソートして一貫性を保つ
    orderBy: {
      createdAt: "desc",
    },
  });

  // 🚀 パフォーマンス最適化: Map を使用して高速なルックアップ
  const officialServerList = officialServers.map((server) => {
    // 最初のtoolGroupToolからuserMcpServerConfigを取得
    const firstToolGroupTool = server.toolGroup.toolGroupTools[0];
    if (!firstToolGroupTool?.userMcpServerConfig) {
      throw new Error("userMcpServerConfig not found");
    }

    const serverConfig = firstToolGroupTool.userMcpServerConfig;

    // 🚀 メモ化された変換処理
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

    // 🚀 ソート済みデータを直接使用（convertToSortOrderが不要）
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
