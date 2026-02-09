// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { Prisma } from "@tumiki/db/prisma";
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
  // 特定MCPサーバーへの追加権限（指定された場合は既存を全て置換）
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
 * ロール更新実装（EE版）
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
    // トランザクションでロール更新とMCP権限の置換を実行
    const role = await ctx.db.$transaction(async (tx) => {
      // ロール基本情報とデフォルト権限を更新
      await tx.organizationRole.update({
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
      });

      // MCP権限が指定されている場合は既存を削除して新規作成
      if (input.mcpPermissions !== undefined) {
        // 既存のMCP権限を全て削除
        await tx.mcpPermission.deleteMany({
          where: {
            organizationSlug: ctx.currentOrg.slug,
            roleSlug: input.slug,
          },
        });

        // 新しいMCP権限を作成
        if (input.mcpPermissions.length > 0) {
          await tx.mcpPermission.createMany({
            data: input.mcpPermissions.map((p) => ({
              organizationSlug: ctx.currentOrg.slug,
              roleSlug: input.slug,
              mcpServerId: p.mcpServerId,
              read: p.read,
              write: p.write,
              execute: p.execute,
            })),
          });
        }
      }

      // 最終的なロールをMCP権限付きで取得
      return tx.organizationRole.findUniqueOrThrow({
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
    });

    return role;
  } catch (error) {
    console.error("ロール更新エラー:", error);

    // Prismaエラーの種類に応じた適切なエラーコードを返す
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: レコードが見つからない
      if (error.code === "P2025") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "指定されたロールが見つかりません",
        });
      }
      // P2002: ユニーク制約違反
      if (error.code === "P2002") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "権限設定が重複しています",
        });
      }
      // P2003: 外部キー制約違反
      if (error.code === "P2003") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "指定されたMCPサーバーが存在しません",
        });
      }
    }

    // TRPCErrorはそのまま再スロー
    if (error instanceof TRPCError) {
      throw error;
    }

    // その他のエラー
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ロールの更新中にエラーが発生しました",
    });
  }
};
