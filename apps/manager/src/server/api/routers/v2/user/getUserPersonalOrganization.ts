import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";

/**
 * ユーザーの個人組織取得の入力スキーマ
 */
export const getUserPersonalOrganizationInputSchema = z.object({
  userId: z.string(),
});

export type GetUserPersonalOrganizationInput = z.infer<
  typeof getUserPersonalOrganizationInputSchema
>;

/**
 * ユーザーの個人組織取得の出力スキーマ
 */
export const getUserPersonalOrganizationOutputSchema = z.object({
  organizationId: z.string(),
  isAdmin: z.boolean(),
});

export type GetUserPersonalOrganizationOutput = z.infer<
  typeof getUserPersonalOrganizationOutputSchema
>;

/**
 * ユーザーの個人組織情報を取得
 *
 * signInコールバックでKeycloak属性を更新するために使用
 */
export const getUserPersonalOrganization = async (
  tx: PrismaTransactionClient,
  input: GetUserPersonalOrganizationInput,
): Promise<GetUserPersonalOrganizationOutput> => {
  const dbUser = await tx.user.findUnique({
    where: { id: input.userId },
    include: {
      members: {
        where: {
          organization: { isPersonal: true },
        },
        include: {
          organization: true,
        },
      },
    },
  });

  if (!dbUser) {
    throw new Error(`User not found: ${input.userId}`);
  }

  const personalOrgMember = dbUser.members[0];

  if (!personalOrgMember?.organization) {
    throw new Error(`No personal organization found for user: ${input.userId}`);
  }

  return {
    organizationId: personalOrgMember.organization.id,
    isAdmin: personalOrgMember.isAdmin,
  };
};
