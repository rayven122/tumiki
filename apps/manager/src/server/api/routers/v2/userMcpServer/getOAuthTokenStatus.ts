import type { PrismaTransactionClient } from "@tumiki/db";
import {
  oauthTokenStatusSchema,
  calculateOAuthTokenStatus,
  type OAuthTokenStatus,
} from "./helpers/oauthTokenHelpers";

type GetOAuthTokenStatusInput = {
  mcpServerTemplateId: string;
  userId: string;
};

// OAuth トークン状態のレスポンススキーマ
export const getOAuthTokenStatusOutputSchema = oauthTokenStatusSchema;

export type GetOAuthTokenStatusOutput = OAuthTokenStatus;

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
      refreshTokenExpiresAt: true,
    },
  });

  // トークンの有効期限を取得（存在しない場合は undefined）
  const refreshTokenExpiresAt = token?.refreshTokenExpiresAt ?? undefined;
  const accessTokenExpiresAt = token?.expiresAt ?? undefined;

  // 共通関数を使用してステータスを計算（Refresh Token優先）
  return calculateOAuthTokenStatus(refreshTokenExpiresAt, accessTokenExpiresAt);
};
