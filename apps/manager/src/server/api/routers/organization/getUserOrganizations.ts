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

  // ユーザーが所属する組織の一覧を取得
  const organizationMembers = await db.organizationMember.findMany({
    where: {
      userId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
        },
      },
    },
  });

  // 組織情報を整理して返す
  return organizationMembers.map((member) => ({
    id: member.organization.id,
    name: member.organization.name,
    description: member.organization.description,
    logoUrl: member.organization.logoUrl,
    isAdmin: member.isAdmin,
  }));
};
