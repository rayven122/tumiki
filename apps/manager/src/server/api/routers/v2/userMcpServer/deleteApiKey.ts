import { z } from "zod";
import type { PrismaTransactionClient } from "@tumiki/db";

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

  // APIキーの存在確認と権限チェック
  const apiKey = await db.mcpApiKey.findUnique({
    where: { id: apiKeyId, userId },
  });

  if (!apiKey) {
    throw new Error("APIキーが見つかりません");
  }

  // APIキーを削除
  await db.mcpApiKey.delete({
    where: { id: apiKeyId, userId },
  });

  return {
    id: apiKeyId,
  };
};
