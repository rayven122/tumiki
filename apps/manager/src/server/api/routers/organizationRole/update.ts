import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import type { ProtectedContext } from "../../trpc";
import type { UpdateRoleInput } from "./schemas";

type UpdateRoleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateRoleInput>;
};

export const updateRole = async ({ ctx, input }: UpdateRoleProps) => {
  const { id, name, description, isDefault } = input;

  // ロールの存在確認と組織情報の取得
  const role = await db.organizationRole.findUnique({
    where: { id },
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

  // 名前を変更する場合、同じ組織内で重複しないかチェック
  if (name && name !== role.name) {
    const existingRole = await db.organizationRole.findFirst({
      where: {
        organizationId: role.organizationId,
        name,
        id: { not: id },
      },
    });

    if (existingRole) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "同じ名前のロールが既に存在します",
      });
    }
  }

  // デフォルトロールに設定する場合、既存のデフォルトロールを解除
  if (isDefault && !role.isDefault) {
    await db.organizationRole.updateMany({
      where: {
        organizationId: role.organizationId,
        isDefault: true,
        id: { not: id },
      },
      data: {
        isDefault: false,
      },
    });
  }

  // ロール情報を更新
  const updatedRole = await db.organizationRole.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isDefault !== undefined && { isDefault }),
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

  return updatedRole;
};