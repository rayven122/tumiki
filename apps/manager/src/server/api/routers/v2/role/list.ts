import { z } from "zod";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * ロール一覧取得 Input スキーマ
 */
export const listRolesInputSchema = z.object({
  includePermissions: z.boolean().default(true),
});

export type ListRolesInput = z.infer<typeof listRolesInputSchema>;

/**
 * ロール一覧取得 Output スキーマ
 */
export const listRolesOutputSchema = z.array(
  z.object({
    organizationSlug: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isDefault: z.boolean(),
    defaultRead: z.boolean(),
    defaultWrite: z.boolean(),
    defaultExecute: z.boolean(),
    mcpPermissions: z
      .array(
        z.object({
          id: z.string(),
          mcpServerId: z.string(),
          read: z.boolean(),
          write: z.boolean(),
          execute: z.boolean(),
          createdAt: z.date(),
          updatedAt: z.date(),
        }),
      )
      .optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export type ListRolesOutput = z.infer<typeof listRolesOutputSchema>;

/**
 * ロール一覧取得実装
 */
export const listRoles = async ({
  input,
  ctx,
}: {
  input: ListRolesInput;
  ctx: ProtectedContext;
}): Promise<ListRolesOutput> => {
  // 権限チェック（メンバー以上は閲覧可能）
  validateOrganizationAccess(ctx.currentOrg);

  const roles = await ctx.db.organizationRole.findMany({
    where: {
      organizationSlug: ctx.currentOrg.slug,
    },
    include: {
      mcpPermissions: input.includePermissions,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return roles;
};
