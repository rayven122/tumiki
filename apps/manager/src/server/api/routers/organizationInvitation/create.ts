import "server-only";

import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import { type ProtectedContext } from "../../trpc";
import { generateInviteToken, calculateInviteExpiration } from "@/lib/inviteTokens";
import { sendInviteEmail } from "@/lib/inviteEmails";
import { type CreateInvitationInput } from "./schemas";

type CreateInvitationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CreateInvitationInput>;
};

export const createInvitation = async ({ ctx, input }: CreateInvitationProps) => {
  const { organizationId, email, isAdmin, roleIds, groupIds, expiresInDays } = input;
  const userId = ctx.session.user.id;

  // ユーザーがこの組織の管理者またはメンバー管理権限を持っているかチェック
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
                  action: "CREATE",
                },
              },
            },
          },
        },
      ],
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!organizationMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "組織のメンバー招待権限がありません",
    });
  }

  // 既に招待済みでないかチェック
  const existingInvitation = await db.organizationInvitation.findFirst({
    where: {
      organizationId,
      email,
    },
  });

  if (existingInvitation) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "このメールアドレスには既に招待が送信されています",
    });
  }

  // 既にメンバーでないかチェック
  const existingMember = await db.user.findFirst({
    where: {
      email,
      organizationMembers: {
        some: {
          organizationId,
        },
      },
    },
  });

  if (existingMember) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "このユーザーは既に組織のメンバーです",
    });
  }

  // ロールIDとグループIDの存在確認
  if (roleIds.length > 0) {
    const roles = await db.organizationRole.findMany({
      where: {
        id: { in: roleIds },
        organizationId,
      },
    });

    if (roles.length !== roleIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "指定されたロールの一部が存在しません",
      });
    }
  }

  if (groupIds.length > 0) {
    const groups = await db.organizationGroup.findMany({
      where: {
        id: { in: groupIds },
        organizationId,
      },
    });

    if (groups.length !== groupIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "指定されたグループの一部が存在しません",
      });
    }
  }

  const token = generateInviteToken();
  const expires = calculateInviteExpiration(expiresInDays);

  // 招待を作成
  const invitation = await db.organizationInvitation.create({
    data: {
      organizationId,
      email,
      token,
      invitedBy: userId,
      isAdmin,
      roleIds,
      groupIds,
      expires,
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

  // 招待メールを送信（将来実装）
  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${token}`;
  await sendInviteEmail({
    email,
    organizationName: invitation.organization.name,
    inviterName: invitation.invitedByUser.name ?? "Unknown",
    inviteToken: token,
    inviteUrl,
  });

  return {
    id: invitation.id,
    email: invitation.email,
    expires: invitation.expires,
    createdAt: invitation.createdAt,
    inviteUrl,
  };
};