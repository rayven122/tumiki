import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  OrganizationInvitationIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
  InvitationTokenSchema,
  OrganizationRoleIdSchema,
  OrganizationGroupIdSchema,
} from "@/schema/ids";

export const getInvitationsOutputSchema = z.array(
  z.object({
    id: OrganizationInvitationIdSchema,
    organizationId: OrganizationIdSchema,
    email: z.string().email(),
    token: InvitationTokenSchema,
    invitedBy: UserIdSchema,
    invitedByUser: z.object({
      id: UserIdSchema,
      name: z.string().nullable(),
      email: z.string().email().nullable(),
      image: z.string().url().nullable(),
    }),
    isAdmin: z.boolean(),
    roleIds: z.array(OrganizationRoleIdSchema),
    groupIds: z.array(OrganizationGroupIdSchema),
    expires: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export type GetInvitationsOutput = z.infer<typeof getInvitationsOutputSchema>;

export const getInvitations = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetInvitationsOutput> => {
  // 現在の組織IDを取得
  const organizationId = ctx.session.user.organizationId;

  // 組織メンバーシップを取得して管理者権限を検証
  const membership = await ctx.db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organizationId,
        userId: ctx.session.user.id,
      },
    },
  });

  if (!membership?.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この操作を行う権限がありません",
    });
  }

  const invitations = await ctx.db.organizationInvitation.findMany({
    where: {
      organizationId,
    },
    include: {
      invitedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return getInvitationsOutputSchema.parse(invitations);
};
