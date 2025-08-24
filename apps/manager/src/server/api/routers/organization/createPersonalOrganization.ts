import { TRPCError } from "@trpc/server";
import type { AuthenticatedContext } from "../../trpc";

type CreatePersonalOrganizationInput = {
  ctx: AuthenticatedContext;
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
        isDeleted: false,
      },
    },
    include: {
      organization: true,
    },
  });

  if (existingMembership) {
    // 既に個人組織が存在する場合、defaultOrganizationIdが設定されているか確認
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
    });

    if (user && !user.defaultOrganizationId) {
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          defaultOrganizationId: existingMembership.organization.id,
        },
      });
    }

    return existingMembership.organization;
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

  // トランザクションで個人組織の作成を実行
  const personalOrg = await ctx.db.organization.create({
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

  // ユーザーのdefaultOrganizationIdを設定
  await ctx.db.user.update({
    where: { id: userId },
    data: {
      defaultOrganizationId: personalOrg.id,
    },
  });

  return personalOrg;
};
