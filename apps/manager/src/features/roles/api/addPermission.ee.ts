// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

/**
 * MCPサーバー権限追加/更新 Input スキーマ
 *
 * 特定のMCPサーバーに対する追加権限を設定
 * （デフォルト権限はOrganizationRoleで管理）
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
 * MCPサーバー権限追加/更新 Output スキーマ
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
 * MCPサーバー権限追加/更新実装（EE版）（Upsert）
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

  // ロールの存在確認
  const role = await ctx.db.organizationRole.findUnique({
    where: {
      organizationSlug_slug: {
        organizationSlug: ctx.currentOrg.slug,
        slug: input.roleSlug,
      },
    },
  });

  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "指定されたロールが見つかりません",
    });
  }

  // MCPサーバーの存在確認（組織内のサーバーかチェック）
  const mcpServer = await ctx.db.mcpServer.findFirst({
    where: {
      id: input.mcpServerId,
      organizationId: ctx.currentOrg.id,
      deletedAt: null,
    },
  });

  if (!mcpServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "指定されたMCPサーバーが見つかりません",
    });
  }

  // Upsert（既存の場合は更新、なければ作成）
  const permission = await ctx.db.mcpPermission.upsert({
    where: {
      organizationSlug_roleSlug_mcpServerId: {
        organizationSlug: ctx.currentOrg.slug,
        roleSlug: input.roleSlug,
        mcpServerId: input.mcpServerId,
      },
    },
    update: {
      read: input.read,
      write: input.write,
      execute: input.execute,
    },
    create: {
      organizationSlug: ctx.currentOrg.slug,
      roleSlug: input.roleSlug,
      mcpServerId: input.mcpServerId,
      read: input.read,
      write: input.write,
      execute: input.execute,
    },
  });

  return permission;
};
