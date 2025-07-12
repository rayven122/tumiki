import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { RemoveMemberInput } from ".";

type RemoveMemberProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof RemoveMemberInput>;
};

export const removeMember = async ({
  ctx,
  input,
}: RemoveMemberProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const { organizationId, memberId } = input;

  // まず、現在のユーザーが指定された組織のメンバーかつ、メンバーを削除する権限があるかチェック
  const currentUserMember = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    include: {
      roles: {
        include: {
          permissions: true,
        },
      },
    },
  });

  if (!currentUserMember) {
    throw new Error("組織にアクセスする権限がありません");
  }

  // メンバーを削除する権限があるかチェック
  const hasDeletePermission = currentUserMember.isAdmin || 
    currentUserMember.roles.some(role => 
      role.permissions.some(permission => 
        permission.resourceType === "MEMBER" && permission.action === "DELETE"
      )
    );

  if (!hasDeletePermission) {
    throw new Error("メンバーを削除する権限がありません");
  }

  // 削除対象のメンバーが存在するかチェック
  const targetMember = await db.organizationMember.findUnique({
    where: {
      id: memberId,
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!targetMember) {
    throw new Error("指定されたメンバーが見つかりません");
  }

  // 自分自身を削除しようとしていないかチェック
  if (targetMember.userId === userId) {
    throw new Error("自分自身を削除することはできません");
  }

  // 組織の作成者かどうかをチェック
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { createdBy: true },
  });

  if (organization?.createdBy === targetMember.userId) {
    throw new Error("組織の作成者を削除することはできません");
  }

  // メンバーを削除
  await db.organizationMember.delete({
    where: {
      id: memberId,
    },
  });

  return {
    success: true,
    removedMember: {
      id: targetMember.id,
      userId: targetMember.userId,
      user: targetMember.user,
    },
  };
};