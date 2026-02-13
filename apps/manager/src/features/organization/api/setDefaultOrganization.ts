import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationIdSchema } from "@/schema/ids";

// クライアント側から受け取るスキーマ（userIdは含めない）
export const setDefaultOrganizationInputSchema = z.object({
  organizationId: OrganizationIdSchema,
});

// 内部で使用する完全なInput型（userIdを含む）
type SetDefaultOrganizationInternalInput = {
  userId: string;
  organizationId: z.infer<typeof OrganizationIdSchema>;
};

export const setDefaultOrganizationOutputSchema = z.object({
  success: z.boolean(),
  organizationId: OrganizationIdSchema,
  organizationSlug: z.string(),
});

export type SetDefaultOrganizationInput = SetDefaultOrganizationInternalInput;

export type SetDefaultOrganizationOutput = z.infer<
  typeof setDefaultOrganizationOutputSchema
>;

/**
 * デフォルト組織を設定（v2実装: DB更新あり）
 *
 * ユーザーのdefaultOrganizationSlugを更新して
 * デフォルト組織を切り替える
 */
export const setDefaultOrganization = async (
  tx: PrismaTransactionClient,
  input: SetDefaultOrganizationInput,
): Promise<SetDefaultOrganizationOutput> => {
  const { userId, organizationId } = input;

  // 指定された組織のメンバーであることを確認し、slugも取得
  const membership = await tx.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      organization: {
        isDeleted: false,
      },
    },
    include: {
      organization: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織のメンバーではありません",
    });
  }

  // ユーザーのdefaultOrganizationSlugを更新
  await tx.user.update({
    where: { id: userId },
    data: { defaultOrganizationSlug: membership.organization.slug },
  });

  return {
    success: true,
    organizationId,
    organizationSlug: membership.organization.slug,
  };
};
