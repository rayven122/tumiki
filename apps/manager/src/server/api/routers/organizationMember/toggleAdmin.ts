import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { ToggleAdminInput } from ".";

type ToggleAdminProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof ToggleAdminInput>;
};

export const toggleAdmin = async ({
  ctx,
  input,
}: ToggleAdminProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const { organizationId, memberId } = input;

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
        permission.resourceType === "MEMBER" && permission.action === "MANAGE"
      )
    );

  if (!hasManagePermission) {
    throw new Error("メンバーを管理する権限がありません");
  }

  // 対象のメンバーが存在するかチェック
  const targetMember = await db.organizationMember.findUnique({
    where: {
      id: memberId,
      organizationId,
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

  if (!targetMember) {
    throw new Error("指定されたメンバーが見つかりません");
  }

  // 自分自身の管理者権限を変更しようとしていないかチェック
  if (targetMember.userId === userId) {
    throw new Error("自分自身の管理者権限を変更することはできません");
  }

  // 組織の作成者の管理者権限を剥奪しようとしていないかチェック
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { createdBy: true },
  });

  if (organization?.createdBy === targetMember.userId && targetMember.isAdmin) {
    throw new Error("組織の作成者の管理者権限を剥奪することはできません");
  }

  // 管理者権限をトグル
  const updatedMember = await db.organizationMember.update({
    where: {
      id: memberId,
    },
    data: {
      isAdmin: !targetMember.isAdmin,
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

  return {
    id: updatedMember.id,
    userId: updatedMember.userId,
    isAdmin: updatedMember.isAdmin,
    user: updatedMember.user,
    roles: updatedMember.roles,
    groups: updatedMember.groups,
    createdAt: updatedMember.createdAt,
    updatedAt: updatedMember.updatedAt,
  };
};