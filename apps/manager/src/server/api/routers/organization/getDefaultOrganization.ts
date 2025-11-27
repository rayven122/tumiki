import { TRPCError } from "@trpc/server";
import type { AuthenticatedContext } from "../../trpc";

export const getDefaultOrganization = async ({
  ctx,
}: {
  ctx: AuthenticatedContext;
}) => {
  const userId = ctx.session.user.id;

  // ユーザーのdefaultOrganizationSlugを取得
  const user = await ctx.db.user.findUnique({
    where: { id: userId },
    select: {
      defaultOrganization: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          logoUrl: true,
          isPersonal: true,
        },
      },
    },
  });

  if (!user?.defaultOrganization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "デフォルト組織が見つかりません",
    });
  }

  return user.defaultOrganization;
};
