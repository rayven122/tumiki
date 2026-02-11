import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * ロール更新 Input スキーマ（型互換性のため維持）
 */
export const updateRoleInputSchema = z.object({
  slug: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  defaultRead: z.boolean().optional(),
  defaultWrite: z.boolean().optional(),
  defaultExecute: z.boolean().optional(),
  mcpPermissions: z
    .array(
      z.object({
        mcpServerId: z.string(),
        read: z.boolean(),
        write: z.boolean(),
        execute: z.boolean(),
      }),
    )
    .optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleInputSchema>;

/**
 * ロール更新 Output スキーマ（型互換性のため維持）
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
 * ロール更新（CE版スタブ）
 * CE版では利用不可
 */
export const updateRole = async (_params: {
  input: UpdateRoleInput;
  ctx: ProtectedContext;
}): Promise<UpdateRoleOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "ロール管理機能はEnterprise Editionでのみ利用可能です",
  });
};
