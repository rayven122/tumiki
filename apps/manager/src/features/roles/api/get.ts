import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * ロール詳細取得 Input スキーマ
 */
export const getRoleInputSchema = z.object({
  slug: z.string(),
});

export type GetRoleInput = z.infer<typeof getRoleInputSchema>;

/**
 * ロール詳細取得 Output スキーマ
 */
export const getRoleOutputSchema = z.object({
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

export type GetRoleOutput = z.infer<typeof getRoleOutputSchema>;

/**
 * ロール詳細取得実装
 */
export const getRole = async ({
  input,
  ctx,
}: {
  input: GetRoleInput;
  ctx: ProtectedContext;
}): Promise<GetRoleOutput> => {
  // 権限チェック（メンバー以上は閲覧可能）
  validateOrganizationAccess(ctx.currentOrg);

  const role = await ctx.db.organizationRole.findUnique({
    where: {
      organizationSlug_slug: {
        organizationSlug: ctx.currentOrg.slug,
        slug: input.slug,
      },
    },
    include: {
      mcpPermissions: true,
    },
  });

  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "指定されたロールが見つかりません",
    });
  }

  return role;
};
