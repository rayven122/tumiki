import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * MCPサーバー権限追加/更新 Input スキーマ（型互換性のため維持）
 */
export const addPermissionInputSchema = z
  .object({
    roleSlug: z.string(),
    mcpServerId: z.string().min(1, "MCPサーバーIDは必須です"),
    read: z.boolean().default(false),
    write: z.boolean().default(false),
    execute: z.boolean().default(false),
  })
  .refine((data) => data.read || data.write || data.execute, {
    message: "少なくとも1つの権限を有効にしてください",
  });

export type AddPermissionInput = z.infer<typeof addPermissionInputSchema>;

/**
 * MCPサーバー権限追加/更新 Output スキーマ（型互換性のため維持）
 */
export const addPermissionOutputSchema = z.object({
  id: z.string(),
  organizationSlug: z.string(),
  roleSlug: z.string(),
  mcpServerId: z.string(),
  read: z.boolean(),
  write: z.boolean(),
  execute: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AddPermissionOutput = z.infer<typeof addPermissionOutputSchema>;

/**
 * MCPサーバー権限追加/更新（CE版スタブ）
 * CE版では利用不可
 */
export const addPermission = async (_params: {
  input: AddPermissionInput;
  ctx: ProtectedContext;
}): Promise<AddPermissionOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "ロール管理機能はEnterprise Editionでのみ利用可能です",
  });
};
