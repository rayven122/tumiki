import { TRPCError } from "@trpc/server";
import type { Db } from "@tumiki/db/server";

export type OrganizationWithMembers = {
  id: string;
  members: {
    id: string;
    userId: string;
    isAdmin: boolean;
  }[];
  createdBy: string;
};

/**
 * 組織のアクセス権限を検証し、組織データとユーザーのメンバーシップ情報を返す
 */
export const validateOrganizationAccess = async (
  db: Db,
  organizationId: string,
  userId: string,
) => {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        select: {
          id: true,
          userId: true,
          isAdmin: true,
        },
      },
    },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "組織が見つかりません",
    });
  }

  const userMember = organization.members.find(
    (member) => member.userId === userId,
  );

  if (!userMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織にアクセスする権限がありません",
    });
  }

  return {
    organization,
    userMember,
  };
};

/**
 * 組織の管理者権限を検証する
 */
export const validateOrganizationAdminAccess = async (
  db: Db,
  organizationId: string,
  userId: string,
) => {
  const result = await validateOrganizationAccess(db, organizationId, userId);

  if (!result.userMember.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この操作を行う権限がありません",
    });
  }

  return result;
};

/**
 * 組織のメンバーを検索し、権限を検証する
 */
export const findTargetMemberAndValidatePermission = async (
  organization: OrganizationWithMembers,
  targetMemberId: string,
) => {
  const targetMember = organization.members.find(
    (member) => member.id === targetMemberId,
  );

  if (!targetMember) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "対象のメンバーが見つかりません",
    });
  }

  if (targetMember.userId === organization.createdBy) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "組織の作成者は削除できません",
    });
  }

  return targetMember;
};
