import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "../../trpc";

export const getDefaultOrganization = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}) => {
  // セッションから組織slugを取得（protectedProcedureで保証されている）
  const organizationSlug = ctx.session.user.organizationSlug;

  // slugから組織を取得（メンバーシップも検証）
  const organization = await ctx.db.organization.findUnique({
    where: {
      slug: organizationSlug,
      members: { some: { userId: ctx.session.user.id } },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      isPersonal: true,
    },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "デフォルト組織が見つかりません",
    });
  }

  return organization;
};
