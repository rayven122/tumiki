import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import type { ProtectedContext } from "../../trpc";
import type { SetDefaultRoleInput } from "./schemas";

type SetDefaultRoleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof SetDefaultRoleInput>;
};

export const setDefaultRole = async ({ ctx, input }: SetDefaultRoleProps) => {
  const { roleId, organizationId } = input;

  // ロールの存在確認と組織の整合性チェック
  const role = await db.organizationRole.findUnique({
    where: { id: roleId },
    include: {
      organization: true,
    },
  });

  if (!role || role.organizationId !== organizationId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ロールが見つからないか、組織が一致しません",
    });
  }

  // ユーザーが組織のメンバーかつROLE管理権限を持つかチェック
  const member = await db.organizationMember.findFirst({
    where: {
      organizationId,
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

  // トランザクションでデフォルトロールを設定
  const updatedRole = await db.$transaction(async (tx) => {
    // 既存のデフォルトロールを解除
    await tx.organizationRole.updateMany({
      where: {
        organizationId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // 新しいデフォルトロールを設定
    return await tx.organizationRole.update({
      where: { id: roleId },
      data: {
        isDefault: true,
      },
      include: {
        permissions: true,
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