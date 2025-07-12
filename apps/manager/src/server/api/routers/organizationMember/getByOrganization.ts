import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { GetByOrganizationInput } from ".";

type GetByOrganizationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof GetByOrganizationInput>;
};

export const getByOrganization = async ({
  ctx,
  input,
}: GetByOrganizationProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const { organizationId, search, roles, groups, isAdmin } = input;

  // まず、現在のユーザーが指定された組織のメンバーかつ、メンバー情報を読み取る権限があるかチェック
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

  // メンバー情報を読み取る権限があるかチェック
  const hasReadPermission = currentUserMember.isAdmin || 
    currentUserMember.roles.some(role => 
      role.permissions.some(permission => 
        permission.resourceType === "MEMBER" && permission.action === "READ"
      )
    );

  if (!hasReadPermission) {
    throw new Error("メンバー情報を読み取る権限がありません");
  }

  // フィルタ条件を構築
  const whereCondition: any = {
    organizationId,
    organization: {
      isDeleted: false,
    },
  };

  // 検索条件
  if (search) {
    whereCondition.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  // 管理者フィルタ
  if (isAdmin !== undefined) {
    whereCondition.isAdmin = isAdmin;
  }

  // ロールフィルタ
  if (roles && roles.length > 0) {
    whereCondition.roles = {
      some: {
        id: { in: roles },
      },
    };
  }

  // グループフィルタ
  if (groups && groups.length > 0) {
    whereCondition.groups = {
      some: {
        id: { in: groups },
      },
    };
  }

  // メンバー一覧を取得
  const members = await db.organizationMember.findMany({
    where: whereCondition,
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
    orderBy: [
      { isAdmin: "desc" },
      { user: { name: "asc" } },
    ],
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    isAdmin: member.isAdmin,
    user: member.user,
    roles: member.roles,
    groups: member.groups,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  }));
};