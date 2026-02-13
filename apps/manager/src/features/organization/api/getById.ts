import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";

export const getOrganizationByIdInputSchema = z.object({});

export const getOrganizationByIdOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  isDeleted: z.boolean(),
  creator: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
  invitations: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      expires: z.date(),
      invitedByUser: z.object({
        id: z.string(),
        name: z.string().nullable(),
      }),
    }),
  ),
  _count: z.object({
    members: z.number(),
    groups: z.number(),
    roles: z.number(),
  }),
});

export type GetOrganizationByIdInput = z.infer<
  typeof getOrganizationByIdInputSchema
>;
export type GetOrganizationByIdOutput = z.infer<
  typeof getOrganizationByIdOutputSchema
>;

/**
 * 組織詳細を取得（メンバー情報は含まない）
 */
export const getOrganizationById = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetOrganizationByIdOutput> => {
  // 権限を検証
  validateOrganizationAccess(ctx.currentOrg);

  // 組織の基本情報を取得
  const organization = await ctx.db.organization.findUnique({
    where: { id: ctx.currentOrg.id },
    include: {
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
