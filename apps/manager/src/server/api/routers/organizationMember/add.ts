import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { AddMemberInput } from ".";

type AddMemberProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddMemberInput>;
};

export const addMember = async ({
  ctx,
  input,
}: AddMemberProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const { organizationId, userId: targetUserId, isAdmin = false, roleIds = [], groupIds = [] } = input;

  // まず、現在のユーザーが指定された組織のメンバーかつ、メンバーを追加する権限があるかチェック
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

  // メンバーを追加する権限があるかチェック
  const hasCreatePermission = currentUserMember.isAdmin || 
    currentUserMember.roles.some(role => 
      role.permissions.some(permission => 
        permission.resourceType === "MEMBER" && permission.action === "CREATE"
      )
    );

  if (!hasCreatePermission) {
    throw new Error("メンバーを追加する権限がありません");
  }

  // 追加対象のユーザーが存在するかチェック
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error("指定されたユーザーが見つかりません");
  }

  // すでにメンバーでないかチェック
  const existingMember = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: targetUserId,
      },
    },
  });

  if (existingMember) {
    throw new Error("このユーザーはすでに組織のメンバーです");
  }

  // 指定されたロールとグループが存在し、同一組織のものかチェック
  if (roleIds.length > 0) {
    const roles = await db.organizationRole.findMany({
      where: {
        id: { in: roleIds },
        organizationId,
      },
    });

    if (roles.length !== roleIds.length) {
      throw new Error("指定されたロールに無効なものが含まれています");
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
      throw new Error("指定されたグループに無効なものが含まれています");
    }
  }

  // メンバーを追加（トランザクション内で実行）
  const newMember = await db.organizationMember.create({
    data: {
      organizationId,
      userId: targetUserId,
      isAdmin,
      roles: roleIds.length > 0 ? {
        connect: roleIds.map(roleId => ({ id: roleId }))
      } : undefined,
      groups: groupIds.length > 0 ? {
        connect: groupIds.map(groupId => ({ id: groupId }))
      } : undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      roles: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      groups: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  return {
    id: newMember.id,
    userId: newMember.userId,
    isAdmin: newMember.isAdmin,
    user: newMember.user,
    roles: newMember.roles,
    groups: newMember.groups,
    createdAt: newMember.createdAt,
    updatedAt: newMember.updatedAt,
  };
};