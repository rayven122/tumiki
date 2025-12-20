import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import { createPersonalOrganization } from "../organization/createPersonalOrganization";

/**
 * アカウントリンク処理の入力スキーマ
 */
export const handleAccountLinkInputSchema = z.object({
  userId: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
});

export type HandleAccountLinkInput = z.infer<
  typeof handleAccountLinkInputSchema
>;

/**
 * アカウントリンク後の処理を実行する
 *
 * Keycloakプロバイダーの場合、個人組織を自動作成する
 *
 * @param tx Prismaトランザクションクライアント
 * @param input アカウント情報
 */
export const handleAccountLink = async (
  tx: PrismaTransactionClient,
  input: HandleAccountLinkInput,
): Promise<void> => {
  const { userId, provider, providerAccountId } = input;

  // Keycloakプロバイダーの場合のみ、個人組織を作成
  if (provider !== "keycloak") {
    return;
  }

  // ユーザー情報を取得
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // 個人組織を作成
  await createPersonalOrganization(tx, {
    userId,
    providerAccountId,
    userName: user?.name,
    userEmail: user?.email,
  });
};
