import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * MCPサーバー権限削除 Input スキーマ（型互換性のため維持）
 */
export const removePermissionInputSchema = z.object({
  permissionId: z.string(),
});

export type RemovePermissionInput = z.infer<typeof removePermissionInputSchema>;

/**
 * MCPサーバー権限削除 Output スキーマ（型互換性のため維持）
 */
export const removePermissionOutputSchema = z.object({
  success: z.boolean(),
});

export type RemovePermissionOutput = z.infer<
  typeof removePermissionOutputSchema
>;

/**
 * MCPサーバー権限削除（CE版スタブ）
 * CE版では利用不可
 */
export const removePermission = async (_params: {
  input: RemovePermissionInput;
  ctx: ProtectedContext;
}): Promise<RemovePermissionOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "ロール管理機能はEnterprise Editionでのみ利用可能です",
  });
};
