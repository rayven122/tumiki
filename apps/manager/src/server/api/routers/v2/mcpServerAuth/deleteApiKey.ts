import { z } from "zod";
import type { PrismaTransactionClient } from "@tumiki/db";
import { createAdminNotifications } from "@/features/notification";

export const deleteApiKeyInputSchema = z.object({
  apiKeyId: z.string(),
});

export const deleteApiKeyOutputSchema = z.object({
  id: z.string(),
});

type DeleteApiKeyInput = z.infer<typeof deleteApiKeyInputSchema>;
type DeleteApiKeyOutput = z.infer<typeof deleteApiKeyOutputSchema>;

type DeleteApiKeyParams = DeleteApiKeyInput & {
  userId: string;
};

export const deleteApiKey = async (
  db: PrismaTransactionClient,
  params: DeleteApiKeyParams,
): Promise<DeleteApiKeyOutput> => {
  const { apiKeyId, userId } = params;

  // APIキーの存在確認と権限チェック（サーバー情報も取得）
  const apiKey = await db.mcpApiKey.findUnique({
    where: {
      id: apiKeyId,
      userId,
      deletedAt: null, // 削除されていないもののみ
    },
    include: {
      mcpServer: {
        select: {
          name: true,
          organizationId: true,
        },
      },
    },
  });

  if (!apiKey) {
    throw new Error("APIキーが見つかりません");
  }

  // APIキーを論理削除
  await db.mcpApiKey.update({
    where: { id: apiKeyId },
    data: { deletedAt: new Date() },
  });

  // セキュリティアラート: 管理者に通知（非同期で実行）
  if (apiKey.mcpServer?.organizationId) {
    void createAdminNotifications(db, {
      type: "SECURITY_API_KEY_DELETED",
      priority: "NORMAL",
      title: "APIキーが削除されました",
      message: `MCPサーバー「${apiKey.mcpServer.name}」のAPIキー「${apiKey.name}」が削除されました`,
      organizationId: apiKey.mcpServer.organizationId,
      triggeredById: userId,
    });
  }

  return {
    id: apiKeyId,
  };
};
