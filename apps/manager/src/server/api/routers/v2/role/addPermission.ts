import { z } from "zod";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * 権限追加/更新 Input スキーマ
 */
export const addPermissionInputSchema = z
  .object({
    roleSlug: z.string(),
    resourceType: z.enum([
      "MCP_SERVER_CONFIG",
      "MCP_SERVER",
      "MCP_SERVER_TEMPLATE",
    ]),
    resourceId: z.string().default(""), // 空文字列 = 全リソース
    read: z.boolean().default(false),
    write: z.boolean().default(false),
    execute: z.boolean().default(false),
  })
  .refine((data) => data.read || data.write || data.execute, {
    message: "少なくとも1つの権限を有効にしてください",
  });

export type AddPermissionInput = z.infer<typeof addPermissionInputSchema>;

/**
 * 権限追加/更新 Output スキーマ
 */
export const addPermissionOutputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  roleSlug: z.string(),
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
});

export type AddPermissionOutput = z.infer<typeof addPermissionOutputSchema>;

/**
 * 権限追加/更新実装（Upsert）
 */
export const addPermission = async ({
  input,
  ctx,
}: {
  input: AddPermissionInput;
  ctx: ProtectedContext;
}): Promise<AddPermissionOutput> => {
  // 権限チェック（role:manage権限、チーム必須）
  validateOrganizationAccess(ctx.currentOrg, {
    requirePermission: "role:manage",
    requireTeam: true,
  });

  // Upsert（既存の場合は更新、なければ作成）
  const permission = await ctx.db.rolePermission.upsert({
    where: {
      organizationId_roleSlug_resourceType_resourceId: {
        organizationId: ctx.currentOrg.id,
        roleSlug: input.roleSlug,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    },
    update: {
      read: input.read,
      write: input.write,
      execute: input.execute,
    },
    create: {
      organizationId: ctx.currentOrg.id,
      roleSlug: input.roleSlug,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      read: input.read,
      write: input.write,
      execute: input.execute,
    },
  });

  return permission;
};
