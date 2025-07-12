import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import type { ProtectedContext } from "../../trpc";
import type { GetRolesByOrganizationInput } from "./schemas";

type GetRolesByOrganizationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof GetRolesByOrganizationInput>;
};

export const getRolesByOrganization = async ({ ctx, input }: GetRolesByOrganizationProps) => {
  const { organizationId } = input;

  // ユーザーが組織のメンバーかチェック
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

  // 読み取り権限をチェック（管理者または ROLE の READ/MANAGE 権限）
  const hasRoleReadPermission = member.isAdmin || 
    member.roles.some(role => 
      role.permissions.some(permission => 
        permission.resourceType === "ROLE" && 
        (permission.action === "READ" || permission.action === "MANAGE")
      )
    );

  if (!hasRoleReadPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ロール閲覧権限がありません",
    });
  }

  // 組織内のロール一覧を取得
  const roles = await db.organizationRole.findMany({
    where: {
      organizationId,
    },
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
    orderBy: [
      { isDefault: "desc" }, // デフォルトロールを最初に表示
      { name: "asc" },
    ],
  });

  return roles;
};