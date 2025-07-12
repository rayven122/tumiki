import "server-only";

import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import { type ProtectedContext } from "../../trpc";
import { isInviteExpired, isValidTokenFormat } from "@/lib/inviteTokens";
import { type AcceptInvitationInput } from "./schemas";

type AcceptInvitationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof AcceptInvitationInput>;
};

export const acceptInvitation = async ({ ctx, input }: AcceptInvitationProps) => {
  const { token } = input;
  const userId = ctx.session.user.id;

  // トークンの形式チェック
  if (!isValidTokenFormat(token)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "無効なトークン形式です",
    });
  }

  // 招待の存在確認
  const invitation = await db.organizationInvitation.findUnique({
    where: {
      token,
    },
    include: {
      organization: {
        select: {
          id: true,
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

  // 有効期限チェック
  if (isInviteExpired(invitation.expires)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "招待の有効期限が切れています",
    });
  }

  // ユーザーのメールアドレスが招待されたメールと一致するかチェック
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user || user.email !== invitation.email) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この招待はあなたのメールアドレス宛ではありません",
    });
  }

  // 既にメンバーでないかチェック
  const existingMember = await db.organizationMember.findFirst({
    where: {
      organizationId: invitation.organizationId,
      userId,
    },
  });

  if (existingMember) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "既にこの組織のメンバーです",
    });
  }

  // トランザクションで組織メンバーを作成し、招待を削除
  const result = await db.$transaction(async (tx) => {
    // 組織メンバーを作成
    const newMember = await tx.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        isAdmin: invitation.isAdmin,
      },
    });

    // ロールとグループを割り当て
    if (invitation.roleIds.length > 0) {
      await tx.organizationMember.update({
        where: {
          id: newMember.id,
        },
        data: {
          roles: {
            connect: invitation.roleIds.map((roleId) => ({ id: roleId })),
          },
        },
      });
    }

    if (invitation.groupIds.length > 0) {
      await tx.organizationMember.update({
        where: {
          id: newMember.id,
        },
        data: {
          groups: {
            connect: invitation.groupIds.map((groupId) => ({ id: groupId })),
          },
        },
      });
    }

    // 招待を削除
    await tx.organizationInvitation.delete({
      where: {
        id: invitation.id,
      },
    });

    return newMember;
  });

  return {
    success: true,
    message: `${invitation.organization.name}に参加しました`,
    organizationId: invitation.organizationId,
    organizationName: invitation.organization.name,
    memberId: result.id,
    isAdmin: result.isAdmin,
  };
};