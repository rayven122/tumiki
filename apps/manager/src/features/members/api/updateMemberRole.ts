import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * メンバーロール変更入力スキーマ（型互換性のため維持）
 */
export const updateMemberRoleInputSchema = z.object({
  memberId: z.string(),
  newRole: z.enum(["Owner", "Admin", "Member", "Viewer"]),
});

/**
 * メンバーロール変更出力スキーマ（型互換性のため維持）
 */
export const updateMemberRoleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>;
export type UpdateMemberRoleOutput = z.infer<
  typeof updateMemberRoleOutputSchema
>;

/**
 * メンバーロール変更（CE版スタブ）
 * CE版では利用不可
 */
export const updateMemberRole = async (_params: {
  input: UpdateMemberRoleInput;
  ctx: ProtectedContext;
}): Promise<UpdateMemberRoleOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "メンバーロール変更機能はEnterprise Editionでのみ利用可能です",
  });
};
