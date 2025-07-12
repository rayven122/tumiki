import "server-only";

import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import { type Context } from "../../trpc";
import { isInviteExpired, isValidTokenFormat } from "@/lib/inviteTokens";
import { type ValidateTokenInput } from "./schemas";

type ValidateTokenProps = {
  ctx: Context;
  input: z.infer<typeof ValidateTokenInput>;
};

export const validateToken = async ({ ctx, input }: ValidateTokenProps) => {
  const { token } = input;

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
          description: true,
          logoUrl: true,
        },
      },
      invitedByUser: {
        select: {
          name: true,
          email: true,
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

  // 既にメンバーでないかチェック
  if (ctx.session?.user?.sub) {
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: ctx.session.user.sub,
      },
    });

    if (existingMember) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "既にこの組織のメンバーです",
      });
    }
  }

  return {
    id: invitation.id,
    email: invitation.email,
    isAdmin: invitation.isAdmin,
    roleIds: invitation.roleIds,
    groupIds: invitation.groupIds,
    expires: invitation.expires,
    createdAt: invitation.createdAt,
    organization: invitation.organization,
    invitedBy: {
      name: invitation.invitedByUser.name,
      email: invitation.invitedByUser.email,
    },
    isValid: true,
  };
};