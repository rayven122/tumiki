// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * MCPサーバー権限削除 Input スキーマ
 */
export const removePermissionInputSchema = z.object({
  permissionId: z.string(),
});

export type RemovePermissionInput = z.infer<typeof removePermissionInputSchema>;

/**
 * MCPサーバー権限削除 Output スキーマ
 */
export const removePermissionOutputSchema = z.object({
  success: z.boolean(),
});

export type RemovePermissionOutput = z.infer<
  typeof removePermissionOutputSchema
>;

/**
 * MCPサーバー権限削除実装（EE版）
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

  try {
    // 組織境界チェックを含めて削除
    await ctx.db.mcpPermission.delete({
      where: {
        id: input.permissionId,
        organizationSlug: ctx.currentOrg.slug,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("権限削除エラー:", error);
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "指定された権限が見つかりません",
    });
  }
};
