import { z } from "zod";
import type { PrismaTransactionClient } from "@tumiki/db";

export const toggleApiKeyInputSchema = z.object({
  apiKeyId: z.string(),
  isActive: z.boolean(),
});

export const toggleApiKeyOutputSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

type ToggleApiKeyInput = z.infer<typeof toggleApiKeyInputSchema>;
type ToggleApiKeyOutput = z.infer<typeof toggleApiKeyOutputSchema>;

type ToggleApiKeyParams = ToggleApiKeyInput & {
  userId: string;
};

export const toggleApiKey = async (
  db: PrismaTransactionClient,
  params: ToggleApiKeyParams,
): Promise<ToggleApiKeyOutput> => {
  const { apiKeyId, isActive, userId } = params;

  // APIキーの存在確認と権限チェック
  const apiKey = await db.mcpApiKey.findUnique({
    where: {
      id: apiKeyId,
      userId,
      deletedAt: null, // 削除されていないもののみ
    },
  });

  if (!apiKey) {
    throw new Error("APIキーが見つかりません");
  }

  // APIキーの状態を更新
  const updatedKey = await db.mcpApiKey.update({
    where: { id: apiKeyId, userId },
    data: { isActive },
  });

  return {
    id: updatedKey.id,
    isActive: updatedKey.isActive,
  };
};
