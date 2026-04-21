import type { PrismaClient } from "@prisma/desktop-client";

/**
 * IDで有効な接続を1件取得（OAuthトークンリフレッシュ時の単一接続config再生成用）
 */
export const findEnabledConnectionById = async (
  db: PrismaClient,
  connectionId: number,
) => {
  return db.mcpConnection.findFirst({
    where: {
      id: connectionId,
      isEnabled: true,
      server: { isEnabled: true },
    },
    include: { server: true },
  });
};
