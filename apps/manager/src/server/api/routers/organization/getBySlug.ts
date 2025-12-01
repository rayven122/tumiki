import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthenticatedContext } from "@/server/api/trpc";

export const getOrganizationBySlugInputSchema = z.object({
  slug: z.string().min(1),
});

export const getOrganizationBySlugOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isPersonal: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  isAdmin: z.boolean(),
});

export type GetOrganizationBySlugInput = z.infer<
  typeof getOrganizationBySlugInputSchema
>;
export type GetOrganizationBySlugOutput = z.infer<
  typeof getOrganizationBySlugOutputSchema
>;

export const getOrganizationBySlug = async ({
  input,
  ctx,
}: {
  input: GetOrganizationBySlugInput;
  ctx: AuthenticatedContext;
}): Promise<GetOrganizationBySlugOutput> => {
  const organization = await ctx.db.organization.findUnique({
    where: { slug: input.slug },
    include: {
      members: {
        where: { userId: ctx.session.user.sub },
        select: {
          isAdmin: true,
        },
      },
    },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "組織が見つかりません",
    });
  }

  // ユーザーがメンバーかどうかを確認
  if (organization.members.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織にアクセスする権限がありません",
    });
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    isPersonal: organization.isPersonal,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    createdBy: organization.createdBy,
    isAdmin: organization.members[0]!.isAdmin,
  };
};
