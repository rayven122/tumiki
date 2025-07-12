import "server-only";

import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import { type ProtectedContext } from "../../trpc";
import { generateInviteToken, calculateInviteExpiration } from "@/lib/inviteTokens";
import { sendInviteReminderEmail } from "@/lib/inviteEmails";
import { type ResendInvitationInput } from "./schemas";

type ResendInvitationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof ResendInvitationInput>;
};

export const resendInvitation = async ({ ctx, input }: ResendInvitationProps) => {
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
      invitedByUser: {
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

  // ユーザーがこの組織の管理者または招待管理権限を持っているかチェック
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
                  action: "MANAGE",
                },
              },
            },
          },
        },
      ],
    },
  });

  // 招待者本人も自分の招待を再送できる
  const isInviter = invitation.invitedBy === userId;

  if (!organizationMember && !isInviter) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この招待を再送する権限がありません",
    });
  }

  // 新しいトークンと有効期限を生成
  const newToken = generateInviteToken();
  const newExpires = calculateInviteExpiration(7); // 7日間の有効期限

  // 招待を更新
  const updatedInvitation = await db.organizationInvitation.update({
    where: {
      id: invitationId,
    },
    data: {
      token: newToken,
      expires: newExpires,
      updatedAt: new Date(),
    },
  });

  // リマインダーメールを送信（将来実装）
  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${newToken}`;
  await sendInviteReminderEmail({
    email: invitation.email,
    organizationName: invitation.organization.name,
    inviterName: invitation.invitedByUser.name ?? "Unknown",
    inviteToken: newToken,
    inviteUrl,
  });

  return {
    success: true,
    message: "招待を再送しました",
    expires: updatedInvitation.expires,
    inviteUrl,
  };
};