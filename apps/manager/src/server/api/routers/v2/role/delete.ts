import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * ロール削除 Input スキーマ（型互換性のため維持）
 */
export const deleteRoleInputSchema = z.object({
  slug: z.string(),
});

export type DeleteRoleInput = z.infer<typeof deleteRoleInputSchema>;

/**
 * ロール削除 Output スキーマ（型互換性のため維持）
 */
export const deleteRoleOutputSchema = z.object({
  success: z.boolean(),
});

export type DeleteRoleOutput = z.infer<typeof deleteRoleOutputSchema>;

/**
 * ロール削除（CE版スタブ）
 * CE版では利用不可
 */
export const deleteRole = async (_params: {
  input: DeleteRoleInput;
  ctx: ProtectedContext;
}): Promise<DeleteRoleOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "ロール管理機能はEnterprise Editionでのみ利用可能です",
  });
};
