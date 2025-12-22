import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { organizationWithMembersOutput } from "@/server/utils/organizationSchemas";
import {
  KeycloakAdminClient,
  loadKeycloakConfigFromEnv,
} from "@tumiki/keycloak";

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
  ctx: ProtectedContext;
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

  // Keycloakから各メンバーのロールを取得
  const keycloakConfig = loadKeycloakConfigFromEnv();
  const keycloakClient = new KeycloakAdminClient(keycloakConfig);

  // 各メンバーのロールを並列で取得
  const membersWithRolesPromises = organization.members.map(async (member) => {
    try {
      // ユーザーのRealmロールを取得
      const rolesResult = await keycloakClient.getUserRealmRoles(member.userId);

      // 組織ロール（Owner/Admin/Member/Viewer）のみを抽出
      const organizationRoles = rolesResult
        .filter(
          (role: { name?: string }) =>
            role.name &&
            ["Owner", "Admin", "Member", "Viewer"].includes(role.name),
        )
        .map((role: { id?: string; name?: string }) => ({
          id: role.id ?? "",
          name: role.name ?? "",
        }));

      return {
        id: member.id,
        userId: member.userId,
        createdAt: member.createdAt,
        user: member.user,
        roles: organizationRoles,
      };
    } catch (error) {
      // ロール取得失敗時は空配列を返す（部分的な失敗を許容）
      return {
        id: member.id,
        userId: member.userId,
        createdAt: member.createdAt,
        user: member.user,
        roles: [],
      };
    }
  });

  const membersWithRoles = await Promise.all(membersWithRolesPromises);

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
