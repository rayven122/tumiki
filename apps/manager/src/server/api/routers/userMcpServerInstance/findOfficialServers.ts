import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";

type FindOfficialServersInput = {
  ctx: ProtectedContext;
};

/**
 * 新スキーマ：公式サーバー一覧取得
 * - テーブル: UserMcpServerInstance → McpServer
 * - ツールグループ削除、allowedTools（多対多）に変更
 * - mcpServer（1対1） → mcpServerTemplates（多対多）
 */
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
      allowedTools: true,
      mcpServerTemplates: {
        select: {
          id: true,
          name: true,
          description: true,
          tags: true,
          iconPath: true,
          url: true,
        },
      },
    },
  });

  const officialServerList = officialServers.map((server) => {
    return {
      ...server,
      allowedTools: server.allowedTools.map(() => ({})), // ツール数分の空オブジェクト
      mcpServerTemplates: server.mcpServerTemplates,
    };
  });

  return officialServerList;
};
