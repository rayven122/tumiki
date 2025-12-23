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
  permissions: z
    .array(
      z.object({
        resourceType: z.enum([
          "MCP_SERVER_CONFIG",
          "MCP_SERVER",
          "MCP_SERVER_TEMPLATE",
        ]),
        resourceId: z.string().default(""),
        read: z.boolean().default(false),
        write: z.boolean().default(false),
        execute: z.boolean().default(false),
      }),
    )
    .optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleInputSchema>;

/**
 * ロール更新 Output スキーマ
 */
export const updateRoleOutputSchema = z.object({
  organizationId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  permissions: z.array(
    z.object({
      id: z.string(),
      resourceType: z.enum([
        "MCP_SERVER_CONFIG",
        "MCP_SERVER",
        "MCP_SERVER_TEMPLATE",
      ]),
      resourceId: z.string(),
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
 * 注意: 名前・説明・権限を更新（Keycloak操作不要）
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
    // トランザクションでロール更新と権限更新を実行
    const role = await ctx.db.$transaction(async (tx) => {
      // ロール基本情報を更新
      await tx.organizationRole.update({
        where: {
          organizationId_slug: {
            organizationId: ctx.currentOrg.id,
            slug: input.slug,
          },
        },
        data: {
          name: input.name,
          description: input.description,
          isDefault: input.isDefault,
        },
      });

      // 権限が指定されている場合は、既存の権限を削除して新しい権限を作成
      if (input.permissions !== undefined) {
        // 既存の権限を削除
        await tx.rolePermission.deleteMany({
          where: {
            organizationId: ctx.currentOrg.id,
            roleSlug: input.slug,
          },
        });

        // 新しい権限を作成
        if (input.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: input.permissions.map((perm) => ({
              organizationId: ctx.currentOrg.id,
              roleSlug: input.slug,
              resourceType: perm.resourceType,
              resourceId: perm.resourceId,
              read: perm.read,
              write: perm.write,
              execute: perm.execute,
            })),
          });
        }
      }

      // 更新後のロールを権限情報と共に取得
      return tx.organizationRole.findUniqueOrThrow({
        where: {
          organizationId_slug: {
            organizationId: ctx.currentOrg.id,
            slug: input.slug,
          },
        },
        include: {
          permissions: true,
        },
      });
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
