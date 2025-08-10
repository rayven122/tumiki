import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { GetUserOrganizationsInput } from ".";

type GetUserOrganizationsProps = {
  ctx: ProtectedContext;
  input?: z.infer<typeof GetUserOrganizationsInput>;
};

export const getUserOrganizations = async ({
  ctx,
}: GetUserOrganizationsProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;

  // ユーザーが所属する組織の一覧を取得（詳細情報含む）
  const memberships = await db.organizationMember.findMany({
    where: {
      userId,
      organization: {
        isDeleted: false,
      },
    },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        organization: {
          isPersonal: "desc", // 個人組織を先に
        },
      },
      {
        organization: {
          createdAt: "asc",
        },
      },
    ],
  });

  // ユーザー情報を取得してデフォルト組織IDを確認
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      defaultOrganizationId: true,
    },
  });

  return memberships.map((membership) => ({
    ...membership.organization,
    isAdmin: membership.isAdmin,
    memberCount: membership.organization._count.members,
    isDefault: membership.organization.id === user?.defaultOrganizationId,
  }));
};
