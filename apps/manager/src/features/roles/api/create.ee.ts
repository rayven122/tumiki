// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";
import { createAdminNotifications } from "@/features/notification";

// 予約語スラッグ
const RESERVED_ROLE_SLUGS = ["owner", "admin", "member", "viewer", "guest"];

/**
 * ロール作成 Input スキーマ
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
    // デフォルト権限（全MCPサーバーに適用）
    defaultRead: z.boolean().default(false),
    defaultWrite: z.boolean().default(false),
    defaultExecute: z.boolean().default(false),
    // 特定MCPサーバーへの追加権限
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
 * ロール作成 Output スキーマ
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
 * ロール作成実装（EE版）
 *
 * Sagaパターン:
 * 1. Keycloakグループロール作成
 * 2. DB OrganizationRole作成
 * 3. エラー時: Keycloakロールバック（削除）
 */
export const createRole = async ({
  input,
  ctx,
}: {
  input: CreateRoleInput;
  ctx: ProtectedContext;
}): Promise<CreateRoleOutput> => {
  // 1. 権限チェック（role:manage権限、チーム必須）
  validateOrganizationAccess(ctx.currentOrg, {
    requirePermission: "role:manage",
    requireTeam: true,
  });

  const keycloakRoleName = `org:${ctx.currentOrg.slug}:role:${input.slug}`;
  let keycloakRoleCreated = false;

  try {
    // 2. Keycloakでグループロール作成
    const keycloak = KeycloakOrganizationProvider.fromEnv();
    const keycloakResult = await keycloak.createGroupRole(ctx.currentOrg.id, {
      name: keycloakRoleName,
      description: input.description,
    });

    if (!keycloakResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Keycloakロールの作成に失敗しました: ${keycloakResult.error}`,
      });
    }

    keycloakRoleCreated = true;

    // 3. DBトランザクション（OrganizationRole作成）
    const role = await ctx.db.$transaction(
      async (tx: Parameters<Parameters<typeof ctx.db.$transaction>[0]>[0]) => {
        // 既存ロールチェック
        const existing = await tx.organizationRole.findUnique({
          where: {
            organizationSlug_slug: {
              organizationSlug: ctx.currentOrg.slug,
              slug: input.slug,
            },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "このロール識別子は既に使用されています",
          });
        }

        // OrganizationRole作成（デフォルト権限を含む）
        const newRole = await tx.organizationRole.create({
          data: {
            organizationSlug: ctx.currentOrg.slug,
            slug: input.slug,
            name: input.name,
            description: input.description ?? null,
            isDefault: input.isDefault,
            defaultRead: input.defaultRead,
            defaultWrite: input.defaultWrite,
            defaultExecute: input.defaultExecute,
            // 特定MCPサーバーへの追加権限がある場合は同時に作成
            mcpPermissions:
              input.mcpPermissions && input.mcpPermissions.length > 0
                ? {
                    create: input.mcpPermissions.map((p) => ({
                      mcpServerId: p.mcpServerId,
                      read: p.read,
                      write: p.write,
                      execute: p.execute,
                    })),
                  }
                : undefined,
          },
          include: {
            mcpPermissions: true,
          },
        });

        return newRole;
      },
    );

    // セキュリティアラート: 管理者に通知（非同期で実行）
    void createAdminNotifications(ctx.db, {
      type: "SECURITY_ROLE_CREATED",
      priority: "HIGH",
      title: "新しいロールが作成されました",
      message: `カスタムロール「${input.name}」（${input.slug}）が作成されました`,
      organizationId: ctx.currentOrg.id,
      triggeredById: ctx.session.user.id,
    });

    return {
      ...role,
      keycloakRoleName,
    };
  } catch (error) {
    // Keycloakロールバック（ロール削除）
    if (keycloakRoleCreated) {
      try {
        const keycloak = KeycloakOrganizationProvider.fromEnv();
        // 作成時と同じ命名規則を使用: org:{orgSlug}:role:{roleSlug}
        await keycloak.deleteGroupRole(ctx.currentOrg.id, keycloakRoleName);
        console.error(`Keycloakロールバック実行: ${keycloakRoleName}`, error);
      } catch (rollbackError) {
        console.error(
          "Keycloakロールバック失敗（手動削除が必要）:",
          rollbackError,
        );
      }
    }

    if (error instanceof TRPCError) {
      throw error;
    }

    console.error("ロール作成エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ロールの作成中にエラーが発生しました",
    });
  }
};
