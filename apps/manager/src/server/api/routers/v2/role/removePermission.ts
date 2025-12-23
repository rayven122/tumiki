import { z } from "zod";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * 権限削除 Input スキーマ
 */
export const removePermissionInputSchema = z.object({
  permissionId: z.string(),
});

export type RemovePermissionInput = z.infer<typeof removePermissionInputSchema>;

/**
 * 権限削除 Output スキーマ
 */
export const removePermissionOutputSchema = z.object({
  success: z.boolean(),
});

export type RemovePermissionOutput = z.infer<
  typeof removePermissionOutputSchema
>;

/**
 * 権限削除実装
 */
export const removePermission = async ({
  input,
  ctx,
}: {
  input: RemovePermissionInput;
  ctx: ProtectedContext;
}): Promise<RemovePermissionOutput> => {
  // 権限チェック（role:manage権限、チーム必須）
  validateOrganizationAccess(ctx.currentOrg, {
    requirePermission: "role:manage",
    requireTeam: true,
  });

  // 組織境界チェックを含めて削除
  await ctx.db.rolePermission.delete({
    where: {
      id: input.permissionId,
      organizationId: ctx.currentOrg.id,
    },
  });

  return { success: true };
};
