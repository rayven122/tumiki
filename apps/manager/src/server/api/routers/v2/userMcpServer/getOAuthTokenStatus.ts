import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";

type GetOAuthTokenStatusInput = {
  mcpServerTemplateId: string;
  userId: string;
};

// OAuth トークン状態のレスポンススキーマ
export const getOAuthTokenStatusOutputSchema = z.object({
  hasToken: z.boolean(),
  isExpired: z.boolean(),
  isExpiringSoon: z.boolean(),
  expiresAt: z.date().nullable(),
  daysRemaining: z.number().nullable(),
});

export type GetOAuthTokenStatusOutput = z.infer<
  typeof getOAuthTokenStatusOutputSchema
>;

/**
 * OAuth トークンの状態を取得
 * リフレッシュトークンの有効期限がない場合は、トークンの有無のみを返す
 *
 * @param tx - Prisma トランザクションクライアント
 * @param input - 入力パラメータ
 * @returns OAuth トークンの状態
 */
export const getOAuthTokenStatus = async (
  tx: PrismaTransactionClient,
  input: GetOAuthTokenStatusInput,
): Promise<GetOAuthTokenStatusOutput> => {
  const { mcpServerTemplateId, userId } = input;

  // OAuth トークンを取得
  const token = await tx.mcpOAuthToken.findFirst({
    where: {
      userId,
      oauthClient: {
        mcpServerTemplateId,
      },
    },
  });

  // トークンの有無のみを返す
  // リフレッシュトークンの有効期限は不明なため、期限関連の情報は全て null
  return {
    hasToken: !!token,
    isExpired: false,
    isExpiringSoon: false,
    expiresAt: null,
    daysRemaining: null,
  };
};
