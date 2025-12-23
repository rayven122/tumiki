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
  // ページネーション
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const getOrganizationBySlugOutputSchema =
  organizationWithMembersOutput.extend({
    slug: z.string(),
    isPersonal: z.boolean(),
    defaultOrgSlug: z.string().nullable(),
    // ページネーション情報
    totalMembers: z.number(),
    hasMore: z.boolean(),
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

  // 組織の存在確認とメンバー数取得
  const organization = await ctx.db.organization.findUnique({
    where: { slug: decodedSlug },
    include: {
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
  const userMember = await ctx.db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: ctx.session.user.sub,
      },
    },
    include: {
      user: {
        select: {
          defaultOrganizationSlug: true,
        },
      },
    },
  });

  if (!userMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このチームにアクセスする権限がありません",
    });
  }

  // ページネーション付きでメンバーを取得
  const members = await ctx.db.organizationMember.findMany({
    where: { organizationId: organization.id },
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
    take: input.limit,
    skip: input.offset,
    orderBy: { createdAt: "asc" },
  });

  // Keycloakから各メンバーのロールを取得
  const keycloakConfig = loadKeycloakConfigFromEnv();
  const keycloakClient = new KeycloakAdminClient(keycloakConfig);

  // 各メンバーのロールを並列で取得
  const membersWithRolesPromises = members.map(async (member) => {
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
    } catch {
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

  // ページネーション情報を計算
  const totalMembers = organization._count.members;
  const hasMore = input.offset + input.limit < totalMembers;

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
    // ページネーション情報
    totalMembers,
    hasMore,
  };
};
