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
    select: {
      expiresAt: true,
    },
  });

  // トークンが存在しない場合
  if (!token) {
    return {
      hasToken: false,
      isExpired: false,
      isExpiringSoon: false,
      expiresAt: null,
      daysRemaining: null,
    };
  }

  const now = new Date();
  const expiresAt = token.expiresAt;

  // expiresAt が null の場合は期限切れとして扱う
  if (!expiresAt) {
    return {
      hasToken: true,
      isExpired: true,
      isExpiringSoon: false,
      expiresAt: null,
      daysRemaining: null,
    };
  }

  const isExpired = expiresAt < now;

  // 1日以内に期限切れになるかどうか
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const isExpiringSoon = !isExpired && expiresAt < oneDayFromNow;

  // 残り日数を計算
  const daysRemaining = !isExpired
    ? Math.floor((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    hasToken: true,
    isExpired,
    isExpiringSoon,
    expiresAt,
    daysRemaining,
  };
};
