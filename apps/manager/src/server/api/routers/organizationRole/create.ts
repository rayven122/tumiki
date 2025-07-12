import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import type { ProtectedContext } from "../../trpc";
import type { CreateRoleInput } from "./schemas";

type CreateRoleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CreateRoleInput>;
};

export const createRole = async ({ ctx, input }: CreateRoleProps) => {
  const { organizationId, name, description, isDefault, permissions } = input;

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
      code: "NOT_FOUND",
      message: "組織が見つからないか、メンバーではありません",
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

  // 同じ組織内で同じ名前のロールが存在しないかチェック
  const existingRole = await db.organizationRole.findFirst({
    where: {
      organizationId,
      name,
    },
  });

  if (existingRole) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "同じ名前のロールが既に存在します",
    });
  }

  // デフォルトロールに設定する場合、既存のデフォルトロールを解除
  if (isDefault) {
    await db.organizationRole.updateMany({
      where: {
        organizationId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  // トランザクションでロール作成と権限設定を実行
  const role = await db.$transaction(async (tx) => {
    const newRole = await tx.organizationRole.create({
      data: {
        name,
        description,
        organizationId,
        isDefault,
      },
    });

    // 権限が指定されている場合は設定
    if (permissions && permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map(permission => ({
          roleId: newRole.id,
          resourceType: permission.resourceType,
          action: permission.action,
        })),
      });
    }

    return newRole;
  });

  // 作成されたロールを権限付きで取得
  return await db.organizationRole.findUniqueOrThrow({
    where: { id: role.id },
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
};