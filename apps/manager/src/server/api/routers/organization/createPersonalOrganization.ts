import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "../../trpc";

type CreatePersonalOrganizationInput = {
  ctx: ProtectedContext;
};

export const createPersonalOrganization = async ({
  ctx,
}: CreatePersonalOrganizationInput) => {
  const userId = ctx.session.user.id;

  // 既存の組織をチェック
  const existingMembership = await ctx.db.organizationMember.findFirst({
    where: {
      userId,
      organization: {
        isPersonal: true,
      },
    },
    include: {
      organization: true,
    },
  });

  if (existingMembership) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Personal organization already exists",
    });
  }

  // ユーザー情報を取得
  const user = await ctx.db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  // トランザクションで個人組織の作成とユーザー更新を実行
  const personalOrg = await ctx.db.$transaction(async (tx) => {
    // 個人組織を作成（メンバーも同時に追加）
    const org = await tx.organization.create({
      data: {
        name: `${user.name ?? user.email ?? "User"}'s Workspace`,
        description: "Personal workspace",
        isPersonal: true,
        maxMembers: 1,
        createdBy: userId,
        members: {
          create: {
            userId: userId,
            isAdmin: true,
          },
        },
      },
    });

    // デフォルト組織として設定
    await tx.user.update({
      where: { id: userId },
      data: { defaultOrganizationId: org.id },
    });

    return org;
  });

  return personalOrg;
};
