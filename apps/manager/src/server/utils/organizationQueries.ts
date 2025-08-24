import type { Db } from "@tumiki/db/server";

/**
 * 組織の完全な詳細情報を取得するための共通include設定
 */
export const getFullOrganizationInclude = () => ({
  members: {
    include: {
      user: true,
      roles: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
  },
  creator: true,
  invitations: {
    where: {
      expires: {
        gt: new Date(),
      },
    },
    include: {
      invitedByUser: true,
    },
  },
  _count: {
    select: {
      members: true,
      groups: true,
      roles: true,
    },
  },
});

/**
 * 組織の基本情報をメンバー情報と共に取得
 */
export const getOrganizationWithMembers = async (
  db: Db,
  organizationId: string,
) => {
  return await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        include: {
          user: true,
          roles: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });
};

/**
 * 組織の完全な詳細情報を取得
 */
export const getOrganizationWithFullDetails = async (
  db: Db,
  organizationId: string,
) => {
  return await db.organization.findUnique({
    where: { id: organizationId },
    include: getFullOrganizationInclude(),
  });
};

/**
 * 使用量統計取得用のメンバー情報を取得
 */
export const getOrganizationMembersForStats = async (
  db: Db,
  organizationId: string,
) => {
  return await db.organizationMember.findMany({
    where: { organizationId },
    include: { user: true },
  });
};
