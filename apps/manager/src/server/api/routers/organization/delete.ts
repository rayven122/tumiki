import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { OrganizationIdSchema } from "@/schema/ids";

export const deleteOrganizationInputSchema = z.object({
  id: OrganizationIdSchema,
});

export type DeleteOrganizationInput = z.infer<
  typeof deleteOrganizationInputSchema
>;

export const deleteOrganization = async ({
  input,
  ctx,
}: {
  input: DeleteOrganizationInput;
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
      message: "この組織を削除する権限がありません",
    });
  }

  try {
    // 論理削除
    const organization = await ctx.db.organization.update({
      where: {
        id: input.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    return { success: true, organizationId: organization.id };
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の削除に失敗しました",
    });
  }
};
