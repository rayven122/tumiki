import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

export const getOrganizationByIdInputSchema = z.object({
  id: z.string(),
});

export type GetOrganizationByIdInput = z.infer<
  typeof getOrganizationByIdInputSchema
>;

export const getOrganizationById = async ({
  input,
  ctx,
}: {
  input: GetOrganizationByIdInput;
  ctx: ProtectedContext;
}) => {
  const userId = ctx.session.user.id;

  // ユーザーが組織のメンバーであることを確認
  const membership = await ctx.db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.id,
        userId,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織へのアクセス権限がありません",
    });
  }

  try {
    const organization = await ctx.db.organization.findUnique({
      where: {
        id: input.id,
        isDeleted: false,
      },
      include: {
        members: {
          include: {
            user: true,
            roles: true,
            groups: true,
          },
        },
        creator: true,
        groups: true,
        roles: {
          include: {
            permissions: true,
          },
        },
        invitations: {
          where: {
            expires: {
              gt: new Date(),
            },
          },
          include: {
            invitedByUser: true,
          },
        },
      },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "組織が見つかりません",
      });
    }

    return organization;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の取得に失敗しました",
    });
  }
};
