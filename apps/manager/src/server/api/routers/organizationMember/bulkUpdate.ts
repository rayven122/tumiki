import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { BulkUpdateInput } from ".";

type BulkUpdateProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof BulkUpdateInput>;
};

export const bulkUpdate = async ({
  ctx,
  input,
}: BulkUpdateProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const { organizationId, memberIds, action, roleIds, groupIds, isAdmin } = input;

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
        permission.resourceType === "MEMBER" && 
        (permission.action === "MANAGE" || 
         (action === "DELETE" && permission.action === "DELETE"))
      )
    );

  if (!hasManagePermission) {
    throw new Error("メンバーを管理する権限がありません");
  }

  // 対象のメンバーが存在し、すべて同一組織に属するかチェック
  const targetMembers = await db.organizationMember.findMany({
    where: {
      id: { in: memberIds },
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

  if (targetMembers.length !== memberIds.length) {
    throw new Error("指定されたメンバーの中に無効なものが含まれています");
  }

  // 自分自身が含まれていないかチェック
  const containsSelf = targetMembers.some(member => member.userId === userId);
  if (containsSelf) {
    throw new Error("自分自身を一括操作の対象に含めることはできません");
  }

  // 組織の作成者が含まれていないかチェック
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { createdBy: true },
  });

  const containsCreator = targetMembers.some(member => member.userId === organization?.createdBy);
  if (containsCreator && action === "DELETE") {
    throw new Error("組織の作成者を削除することはできません");
  }

  // 操作に応じて処理を分岐
  let results: any[] = [];

  switch (action) {
    case "DELETE":
      // 一括削除
      await db.organizationMember.deleteMany({
        where: {
          id: { in: memberIds },
          organizationId,
        },
      });

      results = targetMembers.map(member => ({
        id: member.id,
        userId: member.userId,
        user: member.user,
        action: "deleted",
      }));
      break;

    case "UPDATE_ROLES":
      // 指定されたロールが存在し、同一組織のものかチェック
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

      // 一括ロール更新
      const roleUpdates = await Promise.all(
        memberIds.map(async (memberId) => {
          return await db.organizationMember.update({
            where: { id: memberId },
            data: {
              roles: roleIds ? {
                set: roleIds.map(roleId => ({ id: roleId }))
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
        })
      );

      results = roleUpdates.map(member => ({
        id: member.id,
        userId: member.userId,
        isAdmin: member.isAdmin,
        user: member.user,
        roles: member.roles,
        groups: member.groups,
        action: "updated_roles",
      }));
      break;

    case "UPDATE_GROUPS":
      // 指定されたグループが存在し、同一組織のものかチェック
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

      // 一括グループ更新
      const groupUpdates = await Promise.all(
        memberIds.map(async (memberId) => {
          return await db.organizationMember.update({
            where: { id: memberId },
            data: {
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
        })
      );

      results = groupUpdates.map(member => ({
        id: member.id,
        userId: member.userId,
        isAdmin: member.isAdmin,
        user: member.user,
        roles: member.roles,
        groups: member.groups,
        action: "updated_groups",
      }));
      break;

    case "UPDATE_ADMIN":
      if (isAdmin === undefined) {
        throw new Error("管理者権限の更新にはisAdminパラメータが必要です");
      }

      // 組織の作成者の管理者権限を剥奪しようとしていないかチェック
      if (!isAdmin && containsCreator) {
        throw new Error("組織の作成者の管理者権限を剥奪することはできません");
      }

      // 一括管理者権限更新
      const adminUpdates = await Promise.all(
        memberIds.map(async (memberId) => {
          return await db.organizationMember.update({
            where: { id: memberId },
            data: { isAdmin },
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
        })
      );

      results = adminUpdates.map(member => ({
        id: member.id,
        userId: member.userId,
        isAdmin: member.isAdmin,
        user: member.user,
        roles: member.roles,
        groups: member.groups,
        action: "updated_admin",
      }));
      break;

    default:
      throw new Error("無効な操作です");
  }

  return {
    success: true,
    updatedCount: results.length,
    results,
  };
};