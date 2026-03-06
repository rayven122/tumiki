import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

// 予約語スラッグ（型互換性のため維持）
const RESERVED_ROLE_SLUGS = ["owner", "admin", "member", "viewer", "guest"];

/**
 * ロール作成 Input スキーマ（型互換性のため維持）
 */
export const createRoleInputSchema = z
  .object({
    slug: z
      .string()
      .min(1, "ロール識別子は必須です")
      .max(50, "ロール識別子は50文字以内で入力してください")
      .regex(
        /^[a-z0-9-]+$/,
        "ロール識別子は小文字英数字とハイフンのみ使用できます",
      ),
    name: z
      .string()
      .min(1, "ロール名は必須です")
      .max(100, "ロール名は100文字以内で入力してください"),
    description: z.string().max(500).optional(),
    isDefault: z.boolean().default(false),
    defaultRead: z.boolean().default(false),
    defaultWrite: z.boolean().default(false),
    defaultExecute: z.boolean().default(false),
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
  })
  .refine((data) => !RESERVED_ROLE_SLUGS.includes(data.slug), {
    message:
      "このロール識別子は予約語のため使用できません（owner, admin, member, viewer, guest）",
    path: ["slug"],
  });

export type CreateRoleInput = z.infer<typeof createRoleInputSchema>;

/**
 * ロール作成 Output スキーマ（型互換性のため維持）
 */
export const createRoleOutputSchema = z.object({
  organizationSlug: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  defaultRead: z.boolean(),
  defaultWrite: z.boolean(),
  defaultExecute: z.boolean(),
  keycloakRoleName: z.string(),
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

export type CreateRoleOutput = z.infer<typeof createRoleOutputSchema>;

/**
 * ロール作成（CE版スタブ）
 * CE版では利用不可
 */
export const createRole = async (_params: {
  input: CreateRoleInput;
  ctx: ProtectedContext;
}): Promise<CreateRoleOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "ロール管理機能はEnterprise Editionでのみ利用可能です",
  });
};
