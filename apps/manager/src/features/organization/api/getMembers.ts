import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import {
  KeycloakAdminClient,
  loadKeycloakConfigFromEnv,
} from "@tumiki/keycloak";

export const getMembersInputSchema = z.object({
  // ページネーション
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const getMembersOutputSchema = z.object({
  members: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      createdAt: z.date(),
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        image: z.string().nullable(),
      }),
      roles: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        }),
      ),
    }),
  ),
  // ページネーション情報
  totalMembers: z.number(),
  hasMore: z.boolean(),
});

export type GetMembersInput = z.infer<typeof getMembersInputSchema>;
export type GetMembersOutput = z.infer<typeof getMembersOutputSchema>;

/**
 * 組織のメンバー一覧を取得（ページネーション付き）
 */
export const getMembers = async ({
  input,
  ctx,
}: {
  input: GetMembersInput;
  ctx: ProtectedContext;
}): Promise<GetMembersOutput> => {
  // 権限を検証
  validateOrganizationAccess(ctx.currentOrg);

  // メンバー総数を取得
  const totalMembers = await ctx.db.organizationMember.count({
    where: { organizationId: ctx.currentOrg.id },
  });

  // ページネーション付きでメンバーを取得
  const members = await ctx.db.organizationMember.findMany({
    where: { organizationId: ctx.currentOrg.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    take: input.limit,
    skip: input.offset,
    orderBy: { createdAt: "desc" },
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
  const hasMore = input.offset + input.limit < totalMembers;

  return {
    members: membersWithRoles,
    totalMembers,
    hasMore,
  };
};
