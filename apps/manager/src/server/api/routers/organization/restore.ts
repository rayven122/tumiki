import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { OrganizationIdSchema } from "@/schema/ids";

export const restoreOrganizationInputSchema = z.object({
  id: OrganizationIdSchema,
});

export type RestoreOrganizationInput = z.infer<
  typeof restoreOrganizationInputSchema
>;

export const restoreOrganization = async ({
  input,
  ctx,
}: {
  input: RestoreOrganizationInput;
  ctx: ProtectedContext;
}) => {
  const userId = ctx.session.user.id;

  // 権限チェック：ユーザーが組織の管理者であることを確認
  const membership = await ctx.db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.id,
        userId,
      },
    },
  });

  if (!membership?.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織を復元する権限がありません",
    });
  }

  try {
    // 論理削除を解除
    const organization = await ctx.db.organization.update({
      where: {
        id: input.id,
        isDeleted: true,
      },
      data: {
        isDeleted: false,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });

    return organization;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の復元に失敗しました",
    });
  }
};
