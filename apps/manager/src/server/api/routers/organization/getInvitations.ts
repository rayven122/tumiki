import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import {
  OrganizationInvitationIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
  InvitationTokenSchema,
} from "@/schema/ids";

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
 * 招待一覧取得（CE版スタブ）
 * CE版では利用不可
 */
export const getInvitations = async (_params: {
  ctx: ProtectedContext;
}): Promise<GetInvitationsOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "招待一覧取得機能はEnterprise Editionでのみ利用可能です",
  });
};
