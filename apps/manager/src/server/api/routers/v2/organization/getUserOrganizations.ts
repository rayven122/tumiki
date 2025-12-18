import type { PrismaTransactionClient } from "@tumiki/db";

type GetUserOrganizationsInput = {
  userId: string;
};

export const getUserOrganizations = async (
  tx: PrismaTransactionClient,
  input: GetUserOrganizationsInput,
) => {
  const { userId } = input;

  // ユーザーが所属する組織の一覧を取得（詳細情報含む）
  const memberships = await tx.organizationMember.findMany({
    where: {
      userId,
      organization: {
        isDeleted: false,
      },
    },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        organization: {
          isPersonal: "desc", // 個人を先に
        },
      },
      {
        organization: {
          createdAt: "asc",
        },
      },
    ],
  });

  // ユーザーのデフォルト組織を取得
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { defaultOrganization: { select: { id: true } } },
  });

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    description: membership.organization.description,
    logoUrl: membership.organization.logoUrl,
    isDeleted: membership.organization.isDeleted,
    isPersonal: membership.organization.isPersonal,
    maxMembers: membership.organization.maxMembers,
    createdBy: membership.organization.createdBy,
    createdAt: membership.organization.createdAt,
    updatedAt: membership.organization.updatedAt,
    memberCount: membership.organization._count.members,
    isDefault: membership.organization.id === user?.defaultOrganization?.id,
  }));
};
