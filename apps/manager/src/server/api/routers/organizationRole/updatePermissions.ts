import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import type { ProtectedContext } from "../../trpc";
import type { UpdatePermissionsInput } from "./schemas";

type UpdatePermissionsProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdatePermissionsInput>;
};

export const updatePermissions = async ({ ctx, input }: UpdatePermissionsProps) => {
  const { roleId, permissions } = input;

  // ロールの存在確認と組織情報の取得
  const role = await db.organizationRole.findUnique({
    where: { id: roleId },
    include: {
      organization: true,
    },
  });

  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ロールが見つかりません",
    });
  }

  // ユーザーが組織のメンバーかつROLE管理権限を持つかチェック
  const member = await db.organizationMember.findFirst({
    where: {
      organizationId: role.organizationId,
      userId: ctx.session.user.id,
    },
    include: {
      roles: {
        include: {
          permissions: true,
        },
      },
    },
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織のメンバーではありません",
    });
  }

  // 管理者権限または ROLE の MANAGE 権限をチェック
  const hasRoleManagePermission = member.isAdmin || 
    member.roles.some(role => 
      role.permissions.some(permission => 
        permission.resourceType === "ROLE" && permission.action === "MANAGE"
      )
    );

  if (!hasRoleManagePermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ロール管理権限がありません",
    });
  }

  // 重複する権限設定を除去
  const uniquePermissions = permissions.filter((permission, index, self) =>
    index === self.findIndex(p => 
      p.resourceType === permission.resourceType && p.action === permission.action
    )
  );

  // トランザクションで権限を更新
  const updatedRole = await db.$transaction(async (tx) => {
    // 既存の権限を削除
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    // 新しい権限を作成
    if (uniquePermissions.length > 0) {
      await tx.rolePermission.createMany({
        data: uniquePermissions.map(permission => ({
          roleId,
          resourceType: permission.resourceType,
          action: permission.action,
        })),
      });
    }

    // 更新されたロールを取得
    return await tx.organizationRole.findUniqueOrThrow({
      where: { id: roleId },
      include: {
        permissions: {
          orderBy: [
            { resourceType: "asc" },
            { action: "asc" },
          ],
        },
        _count: {
          select: {
            members: true,
            groups: true,
          },
        },
      },
    });
  });

  return updatedRole;
};