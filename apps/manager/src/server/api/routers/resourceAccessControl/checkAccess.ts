import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import type { CheckAccessInput } from "./schemas";

type CheckAccessProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CheckAccessInput>;
};

export const checkAccess = async ({ ctx, input }: CheckAccessProps) => {
  const { db, session } = ctx;
  const targetUserId = input.userId ?? session.user.id;

  // 対象ユーザーが組織のメンバーかチェック
  const organizationMember = await db.organizationMember.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: targetUserId,
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

  if (!organizationMember) {
    return {
      hasAccess: false,
      reason: "ユーザーがこの組織のメンバーではありません",
    };
  }

  // 管理者の場合は全てのアクションを許可
  if (organizationMember.isAdmin) {
    return {
      hasAccess: true,
      reason: "管理者権限",
    };
  }

  // 特定リソースに対する直接のアクセス制御ルールをチェック
  const specificAccessRules = await db.resourceAccessControl.findMany({
    where: {
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      OR: [
        { memberId: organizationMember.id },
        { groupId: { in: organizationMember.groups.map(g => g.id) } },
      ],
    },
  });

  // 拒否ルールを最優先でチェック
  const isDenied = specificAccessRules.some(rule => 
    rule.deniedActions.includes(input.action)
  );

  if (isDenied) {
    return {
      hasAccess: false,
      reason: "明示的な拒否ルールにより禁止されています",
    };
  }

  // 許可ルールをチェック
  const isExplicitlyAllowed = specificAccessRules.some(rule => 
    rule.allowedActions.includes(input.action)
  );

  if (isExplicitlyAllowed) {
    return {
      hasAccess: true,
      reason: "明示的な許可ルール",
    };
  }

  // ロールベースの権限をチェック
  const allRoles = [
    ...organizationMember.roles,
    ...organizationMember.groups.flatMap(group => group.roles),
  ];

  const hasRolePermission = allRoles.some(role =>
    role.permissions.some(permission =>
      permission.resourceType === input.resourceType &&
      permission.action === input.action
    )
  );

  if (hasRolePermission) {
    return {
      hasAccess: true,
      reason: "ロールベース権限",
    };
  }

  return {
    hasAccess: false,
    reason: "適用可能な権限が見つかりません",
  };
};