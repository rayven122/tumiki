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
    defaultOrgSlug: z.string().nullable(),
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              defaultOrganizationSlug: true,
            },
          },
        },
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
    (m) => m.userId === ctx.session.user.sub,
  );

  if (!userMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このチームにアクセスする権限がありません",
    });
  }

  // rolesは空配列（将来的にKeycloakから取得）
  const membersWithRoles = organization.members.map((member) => ({
    id: member.id,
    userId: member.userId,
    createdAt: member.createdAt,
    user: member.user,
    roles: [], // TODO: Week 2以降、Keycloakから取得
  }));

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
    defaultOrgSlug: userMember.user.defaultOrganizationSlug,
    members: membersWithRoles,
    _count: organization._count,
  };
};
