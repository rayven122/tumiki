import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationIdSchema } from "@/schema/ids";
import { getOrganizationProvider } from "~/lib/organizationProvider";

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

  // Keycloak側でユーザーのデフォルト組織を更新
  const provider = getOrganizationProvider();
  const result = await provider.setUserDefaultOrganization({
    userId,
    organizationId,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Keycloakのデフォルト組織設定に失敗しました: ${result.error}`,
    });
  }

  return {
    success: true,
    organizationId,
    organizationSlug: membership.organization.slug,
  };
};
