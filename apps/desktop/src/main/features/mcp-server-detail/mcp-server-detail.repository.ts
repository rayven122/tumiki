import type { PrismaClient } from "@prisma/desktop-client";

/**
 * MCPサーバーをID指定で詳細取得（接続・カタログ・ツール含む）
 */
export const findByIdWithDetails = async (
  db: PrismaClient,
  serverId: number,
) => {
  return db.mcpServer.findUnique({
    where: { id: serverId },
    include: {
      connections: {
        include: {
          catalog: {
            select: { id: true, name: true, description: true, iconPath: true },
          },
          tools: true,
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};
