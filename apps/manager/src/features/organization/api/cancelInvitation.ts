import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { OrganizationInvitationIdSchema } from "@/schema/ids";

export const cancelInvitationInputSchema = z.object({
  invitationId: OrganizationInvitationIdSchema,
});

export const cancelInvitationOutputSchema = z.object({
  success: z.boolean(),
});

export type CancelInvitationInput = z.infer<typeof cancelInvitationInputSchema>;
export type CancelInvitationOutput = z.infer<
  typeof cancelInvitationOutputSchema
>;

/**
 * 招待キャンセル（CE版スタブ）
 * CE版では利用不可
 */
export const cancelInvitation = async (_params: {
  input: CancelInvitationInput;
  ctx: ProtectedContext;
}): Promise<CancelInvitationOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "招待キャンセル機能はEnterprise Editionでのみ利用可能です",
  });
};
