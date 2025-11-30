import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";

type FindOfficialServersInput = {
  ctx: ProtectedContext;
};

type McpServerTemplate = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  iconPath: string | null;
  url: string;
};

export const findOfficialServers = async ({
  ctx,
}: FindOfficialServersInput) => {
  const officialServers = await ctx.db.mcpServer.findMany({
    where: {
      serverType: ServerType.OFFICIAL,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
    orderBy: {
      displayOrder: "asc",
    },
    include: {
      apiKeys: true,
      allowedTools: {
        take: 10, // とりあえず最初の10件を取得
      },
      mcpServers: {
        select: {
          id: true,
          name: true,
          description: true,
          tags: true,
          iconPath: true,
          url: true,
        },
        take: 1,
      },
    },
  });

  const officialServerList = officialServers.map((server) => {
    const toolCount = server.allowedTools?.length ?? 0;
    const mcpServerTemplate = server.mcpServers?.[0];

    return {
      id: server.id,
      name: server.name,
      description: server.description,
      iconPath: server.iconPath,
      serverStatus: server.serverStatus,
      serverType: server.serverType,
      tools: Array(toolCount).fill({}) as Record<string, never>[], // ツール数分の空オブジェクトを作成
      mcpServer: (mcpServerTemplate ?? null) as McpServerTemplate | null, // mcpServerデータを追加
      apiKeys: server.apiKeys,
    };
  });

  return officialServerList;
};
