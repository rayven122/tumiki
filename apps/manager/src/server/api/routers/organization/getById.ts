import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { fullOrganizationOutput } from "@/server/utils/organizationSchemas";

export const getOrganizationByIdInputSchema = z.object({});
export const getOrganizationByIdOutputSchema = fullOrganizationOutput;

export type GetOrganizationByIdInput = z.infer<
  typeof getOrganizationByIdInputSchema
>;
export type GetOrganizationByIdOutput = z.infer<typeof fullOrganizationOutput>;

/**
 * 組織詳細を取得（簡易実装）
 *
 * TODO: Keycloak統合後のロール取得実装が必要
 * - 現在はrolesを空配列で返している
 * - 実装する場合はgetBySlug.tsを参考にKeycloakからロールを取得
 * - groups, rolesのカウントも動的に取得する必要あり
 */
export const getOrganizationById = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetOrganizationByIdOutput> => {
  // 権限を検証
  validateOrganizationAccess(ctx.currentOrg);

  // 完全な組織詳細を取得
  const organization = await ctx.db.organization.findUnique({
    where: { id: ctx.currentOrg.id },
    include: {
      members: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      creator: true,
      invitations: {
        where: {
          expires: {
            gt: new Date(),
          },
        },
        include: {
          invitedByUser: true,
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
    throw new Error("Organization not found");
  }

  // TODO: Keycloakからロールを取得する実装が必要
  // 現在は簡易実装として空配列を返す
  const membersWithRoles = organization.members.map((member) => ({
    id: member.id,
    userId: member.userId,
    createdAt: member.createdAt,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
    },
    roles: [], // TODO: Keycloakから取得する
  }));

  // invitations を整形
  const formattedInvitations = organization.invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    expires: inv.expires,
    invitedByUser: {
      id: inv.invitedByUser.id,
      name: inv.invitedByUser.name,
    },
  }));

  return {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    logoUrl: organization.logoUrl,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    createdBy: organization.createdBy,
    isDeleted: organization.isDeleted,
    members: membersWithRoles,
    creator: {
      id: organization.creator.id,
      name: organization.creator.name,
      email: organization.creator.email,
    },
    invitations: formattedInvitations,
    _count: {
      members: organization._count.members,
      groups: 0, // TODO: Keycloakグループ統合後は動的カウントが必要
      roles: 0, // TODO: Keycloakロール統合後は動的カウントが必要
    },
  };
};
