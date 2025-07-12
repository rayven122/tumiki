import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@tumiki/auth";
import { db } from "@tumiki/db";
import { PermissionAction, ResourceType } from "@tumiki/db";

export interface AccessControlContext {
  organizationId: string;
  resourceType: ResourceType;
  resourceId: string;
  action: PermissionAction;
  userId?: string;
}

/**
 * アクセス制御ミドルウェア
 * リクエストが特定のリソースに対する権限を持っているかチェックする
 */
export const withAccessControl = (
  handler: (req: NextRequest, context: AccessControlContext) => Promise<Response>,
  accessCheck: (req: NextRequest) => AccessControlContext | Promise<AccessControlContext>
) => {
  return async (req: NextRequest) => {
    try {
      // セッション情報を取得
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "認証が必要です" },
          { status: 401 }
        );
      }

      // アクセス制御コンテキストを取得
      const context = await accessCheck(req);
      const targetUserId = context.userId ?? session.user.id;

      // 権限チェックを実行
      const hasAccess = await checkResourceAccess({
        organizationId: context.organizationId,
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        action: context.action,
        userId: targetUserId,
      });

      if (!hasAccess.hasAccess) {
        return NextResponse.json(
          { error: `アクセスが拒否されました: ${hasAccess.reason}` },
          { status: 403 }
        );
      }

      // 権限がある場合はハンドラーを実行
      return await handler(req, context);
    } catch (error) {
      console.error("Access control middleware error:", error);
      return NextResponse.json(
        { error: "アクセス制御エラーが発生しました" },
        { status: 500 }
      );
    }
  };
};

/**
 * リソースアクセス権限をチェックする共通関数
 */
export const checkResourceAccess = async ({
  organizationId,
  resourceType,
  resourceId,
  action,
  userId,
}: {
  organizationId: string;
  resourceType: ResourceType;
  resourceId: string;
  action: PermissionAction;
  userId: string;
}): Promise<{ hasAccess: boolean; reason: string }> => {
  try {
    // 対象ユーザーが組織のメンバーかチェック
    const organizationMember = await db.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
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
        organizationId,
        resourceType,
        resourceId,
        OR: [
          { memberId: organizationMember.id },
          { groupId: { in: organizationMember.groups.map(g => g.id) } },
        ],
      },
    });

    // 拒否ルールを最優先でチェック
    const isDenied = specificAccessRules.some(rule => 
      rule.deniedActions.includes(action)
    );

    if (isDenied) {
      return {
        hasAccess: false,
        reason: "明示的な拒否ルールにより禁止されています",
      };
    }

    // 許可ルールをチェック
    const isExplicitlyAllowed = specificAccessRules.some(rule => 
      rule.allowedActions.includes(action)
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
        permission.resourceType === resourceType &&
        permission.action === action
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
  } catch (error) {
    console.error("Resource access check error:", error);
    return {
      hasAccess: false,
      reason: "権限チェック中にエラーが発生しました",
    };
  }
};