import { type Context } from "@/server/api/trpc";
import { type z } from "zod";
import type { GetUserOrganizationsInput } from "./router";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { TRPCError } from "@trpc/server";

type GetUserOrganizationsProps = {
  ctx: Context;
  input?: z.infer<typeof GetUserOrganizationsInput>;
};

export const getUserOrganizations = async ({
  ctx,
}: GetUserOrganizationsProps) => {
  const { db, session } = ctx;

  // セッションの存在確認
  if (!session?.user?.sub) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "認証が必要です",
    });
  }

  const userId = session.user.sub;
  const { organizationId: currentOrgId } = getSessionInfo(session);

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
          isPersonal: "desc", // 個人を先に
        },
      },
      {
        organization: {
          createdAt: "asc",
        },
      },
    ],
  });

  return memberships.map(
    (membership: {
      organization: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        logoUrl: string | null;
        isDeleted: boolean;
        isPersonal: boolean;
        maxMembers: number;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        _count: { members: number };
      };
    }) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      description: membership.organization.description,
      logoUrl: membership.organization.logoUrl,
      isDeleted: membership.organization.isDeleted,
      isPersonal: membership.organization.isPersonal,
      maxMembers: membership.organization.maxMembers,
      createdBy: membership.organization.createdBy,
      createdAt: membership.organization.createdAt,
      updatedAt: membership.organization.updatedAt,
      memberCount: membership.organization._count.members,
      isDefault: membership.organization.id === currentOrgId,
    }),
  );
};
