import type { PrismaTransactionClient } from "@tumiki/db";

type GetUserOrganizationsProtectedInput = {
  userId: string;
  /** セッションから取得した現在の組織ID（Keycloak tumikiクレームから） */
  currentOrganizationId?: string;
};

/**
 * ユーザーが所属する組織一覧を取得（protectedProcedure用）
 * v2の実装: PrismaTransactionClientを受け取るシンプルな関数
 */
export const getUserOrganizationsProtected = async (
  tx: PrismaTransactionClient,
  input: GetUserOrganizationsProtectedInput,
) => {
  const { userId, currentOrganizationId } = input;

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
    // Keycloakセッションの現在の組織IDと比較（tumikiクレームから取得）
    isDefault: membership.organization.id === currentOrganizationId,
  }));
};
