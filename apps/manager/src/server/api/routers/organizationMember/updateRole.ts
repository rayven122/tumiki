import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { UpdateRoleInput } from ".";

type UpdateRoleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateRoleInput>;
};

export const updateRole = async ({
  ctx,
  input,
}: UpdateRoleProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const { organizationId, memberId, roleIds, groupIds } = input;

  // まず、現在のユーザーが指定された組織のメンバーかつ、メンバーを管理する権限があるかチェック
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

  // メンバーを管理する権限があるかチェック
  const hasManagePermission = currentUserMember.isAdmin || 
    currentUserMember.roles.some(role => 
      role.permissions.some(permission => 
        permission.resourceType === "MEMBER" && permission.action === "MANAGE"
      )
    );

  if (!hasManagePermission) {
    throw new Error("メンバーを管理する権限がありません");
  }

  // 対象のメンバーが存在するかチェック
  const targetMember = await db.organizationMember.findUnique({
    where: {
      id: memberId,
      organizationId,
    },
  });

  if (!targetMember) {
    throw new Error("指定されたメンバーが見つかりません");
  }

  // 指定されたロールとグループが存在し、同一組織のものかチェック
  if (roleIds && roleIds.length > 0) {
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

  if (groupIds && groupIds.length > 0) {
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

  // メンバーのロールとグループを更新
  const updatedMember = await db.organizationMember.update({
    where: {
      id: memberId,
    },
    data: {
      roles: roleIds ? {
        set: roleIds.map(roleId => ({ id: roleId }))
      } : undefined,
      groups: groupIds ? {
        set: groupIds.map(groupId => ({ id: groupId }))
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
    id: updatedMember.id,
    userId: updatedMember.userId,
    isAdmin: updatedMember.isAdmin,
    user: updatedMember.user,
    roles: updatedMember.roles,
    groups: updatedMember.groups,
    createdAt: updatedMember.createdAt,
    updatedAt: updatedMember.updatedAt,
  };
};