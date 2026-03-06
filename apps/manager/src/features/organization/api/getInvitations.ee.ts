// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import {
  OrganizationInvitationIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
  InvitationTokenSchema,
} from "@/schema/ids";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";

export const getInvitationsOutputSchema = z.array(
  z.object({
    id: OrganizationInvitationIdSchema,
    organizationId: OrganizationIdSchema,
    email: z.string().email(),
    token: InvitationTokenSchema,
    invitedBy: UserIdSchema,
    invitedByUser: z.object({
      id: UserIdSchema,
      name: z.string().nullable(),
      email: z.string().email().nullable(),
      image: z.string().url().nullable(),
    }),
    roles: z.array(z.string()),
    expires: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export type GetInvitationsOutput = z.infer<typeof getInvitationsOutputSchema>;

/**
 * 招待一覧を取得する（EE版）
 *
 * @param ctx - 保護されたコンテキスト
 * @returns 招待一覧
 */
export const getInvitations = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetInvitationsOutput> => {
  // チームメンバーであることを検証（閲覧は一般ユーザーも可能）
  validateOrganizationAccess(ctx.currentOrg, {
    requireAdmin: false,
    requireTeam: true,
  });

  // 現在の組織IDを取得
  const organizationId = ctx.currentOrg.id;

  const invitations = await ctx.db.organizationInvitation.findMany({
    where: {
      organizationId,
    },
    include: {
      invitedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return getInvitationsOutputSchema.parse(invitations);
};
