import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import type { TestPermissionInput } from "./schemas";

type TestPermissionProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof TestPermissionInput>;
};

export const testPermission = async ({ ctx, input }: TestPermissionProps) => {
  const { db, session } = ctx;
  const currentUserId = session.user.id;

  // 権限テストを実行する権限があるかチェック（管理者権限が必要）
  const organizationMember = await db.organizationMember.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: currentUserId,
      isAdmin: true,
    },
  });

  if (!organizationMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "権限テストを実行する権限がありません（管理者権限が必要）",
    });
  }

  // テスト対象ユーザーの情報を取得
  const targetUser = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!targetUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "指定されたユーザーが見つかりません",
    });
  }

  // 対象ユーザーが組織のメンバーかチェック
  const targetMember = await db.organizationMember.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
    },
    include: {
      roles: {
        include: {
          permissions: true,
        },
      },
      groups: {
        include: {
          roles: {
            include: {
              permissions: true,
            },
          },
        },
      },
    },
  });

  if (!targetMember) {
    return {
      user: targetUser,
      hasAccess: false,
      reason: "ユーザーがこの組織のメンバーではありません",
      details: {
        isAdmin: false,
        explicitRules: [],
        rolePermissions: [],
      },
    };
  }

  // 管理者の場合
  if (targetMember.isAdmin) {
    return {
      user: targetUser,
      hasAccess: true,
      reason: "管理者権限",
      details: {
        isAdmin: true,
        explicitRules: [],
        rolePermissions: [],
      },
    };
  }

  // 特定リソースに対する明示的なアクセス制御ルールを取得
  const explicitRules = await db.resourceAccessControl.findMany({
    where: {
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      OR: [
        { memberId: targetMember.id },
        { groupId: { in: targetMember.groups.map(g => g.id) } },
      ],
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 拒否ルールをチェック
  const denyRule = explicitRules.find(rule => 
    rule.deniedActions.includes(input.action)
  );

  if (denyRule) {
    return {
      user: targetUser,
      hasAccess: false,
      reason: "明示的な拒否ルールにより禁止されています",
      details: {
        isAdmin: false,
        explicitRules,
        rolePermissions: [],
        denyRule,
      },
    };
  }

  // 許可ルールをチェック
  const allowRule = explicitRules.find(rule => 
    rule.allowedActions.includes(input.action)
  );

  if (allowRule) {
    return {
      user: targetUser,
      hasAccess: true,
      reason: "明示的な許可ルール",
      details: {
        isAdmin: false,
        explicitRules,
        rolePermissions: [],
        allowRule,
      },
    };
  }

  // ロールベースの権限をチェック
  const allRoles = [
    ...targetMember.roles,
    ...targetMember.groups.flatMap(group => group.roles),
  ];

  const rolePermissions = allRoles.flatMap(role =>
    role.permissions.filter(permission =>
      permission.resourceType === input.resourceType &&
      permission.action === input.action
    ).map(permission => ({
      ...permission,
      roleName: role.name,
      roleId: role.id,
    }))
  );

  const hasRolePermission = rolePermissions.length > 0;

  return {
    user: targetUser,
    hasAccess: hasRolePermission,
    reason: hasRolePermission ? "ロールベース権限" : "適用可能な権限が見つかりません",
    details: {
      isAdmin: false,
      explicitRules,
      rolePermissions,
    },
  };
};