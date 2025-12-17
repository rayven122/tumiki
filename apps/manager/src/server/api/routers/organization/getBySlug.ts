import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthenticatedContext } from "@/server/api/trpc";
import { organizationWithMembersOutput } from "@/server/utils/organizationSchemas";

export const getOrganizationBySlugInputSchema = z.object({
  slug: z.string().min(1),
});

export const getOrganizationBySlugOutputSchema =
  organizationWithMembersOutput.extend({
    slug: z.string(),
    isPersonal: z.boolean(),
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
  // URLエンコードされた文字（%40 -> @など）をデコード
  const decodedSlug = decodeURIComponent(input.slug);

  const organization = await ctx.db.organization.findUnique({
    where: { slug: decodedSlug },
    include: {
      members: {
        include: {
          user: true,
          roles: true,
        },
        orderBy: [
          {
            isAdmin: "desc", // 管理者を上に表示
          },
          {
            createdAt: "desc", // 次に作成日順
          },
        ],
      },
      _count: {
        select: {
          members: true,
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

  // ユーザーのメンバーシップを確認
  const userMember = organization.members.find(
    (member) => member.userId === ctx.session.user.sub,
  );

  if (!userMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このチームにアクセスする権限がありません",
    });
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    logoUrl: organization.logoUrl,
    isPersonal: organization.isPersonal,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    createdBy: organization.createdBy,
    isDeleted: organization.isDeleted,
    isAdmin: userMember.isAdmin,
    members: organization.members,
    _count: organization._count,
  };
};
