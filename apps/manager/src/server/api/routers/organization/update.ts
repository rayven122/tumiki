import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

export const updateOrganizationInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
});

export type UpdateOrganizationInput = z.infer<
  typeof updateOrganizationInputSchema
>;

export const updateOrganization = async ({
  input,
  ctx,
}: {
  input: UpdateOrganizationInput;
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
      message: "この組織を更新する権限がありません",
    });
  }

  try {
    const organization = await ctx.db.organization.update({
      where: {
        id: input.id,
        isDeleted: false,
      },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
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
      message: "組織の更新に失敗しました",
    });
  }
};
