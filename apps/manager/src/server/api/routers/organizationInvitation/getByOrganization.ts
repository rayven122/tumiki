import "server-only";

import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import { type ProtectedContext } from "../../trpc";
import { isInviteExpired } from "@/lib/inviteTokens";
import { type GetInvitationsByOrganizationInput } from "./schemas";

type GetInvitationsByOrganizationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof GetInvitationsByOrganizationInput>;
};

export const getInvitationsByOrganization = async ({ 
  ctx, 
  input 
}: GetInvitationsByOrganizationProps) => {
  const { organizationId } = input;
  const userId = ctx.session.user.id;

  // ユーザーがこの組織のメンバー（招待一覧を見る権限）であることを確認
  const organizationMember = await db.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      OR: [
        { isAdmin: true }, // 組織管理者
        {
          roles: {
            some: {
              permissions: {
                some: {
                  resourceType: "MEMBER",
                  action: "READ",
                },
              },
            },
          },
        },
      ],
    },
  });

  if (!organizationMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "組織の招待一覧を表示する権限がありません",
    });
  }

  // 組織の招待一覧を取得
  const invitations = await db.organizationInvitation.findMany({
    where: {
      organizationId,
    },
    include: {
      invitedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 招待データを整形して返す
  return invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    isAdmin: invitation.isAdmin,
    roleIds: invitation.roleIds,
    groupIds: invitation.groupIds,
    expires: invitation.expires,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    isExpired: isInviteExpired(invitation.expires),
    invitedBy: {
      id: invitation.invitedByUser.id,
      name: invitation.invitedByUser.name,
      email: invitation.invitedByUser.email,
    },
    inviteUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${invitation.token}`,
  }));
};