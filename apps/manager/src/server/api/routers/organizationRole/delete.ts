import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import type { ProtectedContext } from "../../trpc";
import type { DeleteRoleInput } from "./schemas";

type DeleteRoleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteRoleInput>;
};

export const deleteRole = async ({ ctx, input }: DeleteRoleProps) => {
  const { id } = input;

  // ロールの存在確認と組織情報の取得
  const role = await db.organizationRole.findUnique({
    where: { id },
    include: {
      organization: true,
      _count: {
        select: {
          members: true,
          groups: true,
        },
      },
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

  // デフォルトロールは削除できない
  if (role.isDefault) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "デフォルトロールは削除できません",
    });
  }

  // 使用中のロールは削除できない
  if (role._count.members > 0 || role._count.groups > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "メンバーまたはグループに割り当てられているロールは削除できません",
    });
  }

  // トランザクションでロール権限とロールを削除
  await db.$transaction(async (tx) => {
    // 関連する権限を削除
    await tx.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // ロールを削除
    await tx.organizationRole.delete({
      where: { id },
    });
  });

  return { success: true };
};