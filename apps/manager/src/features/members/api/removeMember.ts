import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { removeMemberInput } from "@/server/utils/organizationSchemas";

export const removeMemberInputSchema = removeMemberInput;

export const removeMemberOutputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  // isAdmin削除: JWTのrolesで判定
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RemoveMemberInput = z.infer<typeof removeMemberInput>;
export type RemoveMemberOutput = z.infer<typeof removeMemberOutputSchema>;

/**
 * メンバー削除（CE版スタブ）
 * CE版では利用不可
 */
export const removeMember = async (_params: {
  input: RemoveMemberInput;
  ctx: ProtectedContext;
}): Promise<RemoveMemberOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "メンバー削除機能はEnterprise Editionでのみ利用可能です",
  });
};
