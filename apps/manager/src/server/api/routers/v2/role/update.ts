import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * ロール更新 Input スキーマ
 */
export const updateRoleInputSchema = z.object({
  slug: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  // デフォルト権限（全MCPサーバーに適用）
  defaultRead: z.boolean().optional(),
  defaultWrite: z.boolean().optional(),
  defaultExecute: z.boolean().optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleInputSchema>;

/**
 * ロール更新 Output スキーマ
 */
export const updateRoleOutputSchema = z.object({
  organizationSlug: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  defaultRead: z.boolean(),
  defaultWrite: z.boolean(),
  defaultExecute: z.boolean(),
  mcpPermissions: z.array(
    z.object({
      id: z.string(),
      mcpServerId: z.string(),
      read: z.boolean(),
      write: z.boolean(),
      execute: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UpdateRoleOutput = z.infer<typeof updateRoleOutputSchema>;

/**
 * ロール更新実装
 *
 * 注意: 名前・説明・デフォルト権限を更新（Keycloak操作不要）
 */
export const updateRole = async ({
  input,
  ctx,
}: {
  input: UpdateRoleInput;
  ctx: ProtectedContext;
}): Promise<UpdateRoleOutput> => {
  // 権限チェック（role:manage権限、チーム必須）
  validateOrganizationAccess(ctx.currentOrg, {
    requirePermission: "role:manage",
    requireTeam: true,
  });

  try {
    // ロール基本情報とデフォルト権限を更新
    const role = await ctx.db.organizationRole.update({
      where: {
        organizationSlug_slug: {
          organizationSlug: ctx.currentOrg.slug,
          slug: input.slug,
        },
      },
      data: {
        name: input.name,
        description: input.description,
        isDefault: input.isDefault,
        defaultRead: input.defaultRead,
        defaultWrite: input.defaultWrite,
        defaultExecute: input.defaultExecute,
      },
      include: {
        mcpPermissions: true,
      },
    });

    return role;
  } catch (error) {
    console.error("ロール更新エラー:", error);
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "指定されたロールが見つかりません",
    });
  }
};
