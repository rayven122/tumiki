import "server-only";

import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import { type ProtectedContext } from "../../trpc";
import { type CancelInvitationInput } from "./schemas";

type CancelInvitationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CancelInvitationInput>;
};

export const cancelInvitation = async ({ ctx, input }: CancelInvitationProps) => {
  const { invitationId } = input;
  const userId = ctx.session.user.id;

  // 招待の存在確認
  const invitation = await db.organizationInvitation.findUnique({
    where: {
      id: invitationId,
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "招待が見つかりません",
    });
  }

  // ユーザーがこの組織の管理者または招待削除権限を持っているかチェック
  const organizationMember = await db.organizationMember.findFirst({
    where: {
      organizationId: invitation.organizationId,
      userId,
      OR: [
        { isAdmin: true }, // 組織管理者
        {
          roles: {
            some: {
              permissions: {
                some: {
                  resourceType: "MEMBER",
                  action: "DELETE",
                },
              },
            },
          },
        },
      ],
    },
  });

  // 招待者本人も自分の招待をキャンセルできる
  const isInviter = invitation.invitedBy === userId;

  if (!organizationMember && !isInviter) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この招待をキャンセルする権限がありません",
    });
  }

  // 招待を削除
  await db.organizationInvitation.delete({
    where: {
      id: invitationId,
    },
  });

  return {
    success: true,
    message: "招待をキャンセルしました",
  };
};