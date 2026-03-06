import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { OrganizationInvitationIdSchema } from "@/schema/ids";

export const resendInvitationInputSchema = z.object({
  invitationId: OrganizationInvitationIdSchema,
});

export const resendInvitationOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  expires: z.date(),
});

export type ResendInvitationInput = z.infer<typeof resendInvitationInputSchema>;
export type ResendInvitationOutput = z.infer<
  typeof resendInvitationOutputSchema
>;

/**
 * 招待再送信（CE版スタブ）
 * CE版では利用不可
 */
export const resendInvitation = async (_params: {
  input: ResendInvitationInput;
  ctx: ProtectedContext;
}): Promise<ResendInvitationOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "招待再送信機能はEnterprise Editionでのみ利用可能です",
  });
};
