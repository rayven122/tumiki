// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";
import { createAdminNotifications } from "@/features/notification";

/**
 * ロール削除 Input スキーマ
 */
export const deleteRoleInputSchema = z.object({
  slug: z.string(),
});

export type DeleteRoleInput = z.infer<typeof deleteRoleInputSchema>;

/**
 * ロール削除 Output スキーマ
 */
export const deleteRoleOutputSchema = z.object({
  success: z.boolean(),
});

export type DeleteRoleOutput = z.infer<typeof deleteRoleOutputSchema>;

/**
 * ロール削除実装（EE版）
 *
 * Sagaパターン:
 * 1. Keycloakグループロール削除
 * 2. DB OrganizationRole削除（CASCADE → McpPermission自動削除）
 * 3. エラー時: 補償トランザクション（Keycloakロール再作成）
 */
export const deleteRole = async ({
  input,
  ctx,
}: {
  input: DeleteRoleInput;
  ctx: ProtectedContext;
}): Promise<DeleteRoleOutput> => {
  // 権限チェック（role:manage権限、チーム必須）
  validateOrganizationAccess(ctx.currentOrg, {
    requirePermission: "role:manage",
    requireTeam: true,
  });

  const keycloakRoleName = `org:${ctx.currentOrg.slug}:role:${input.slug}`;
  let roleDeleted = false;
  let roleBackup: {
    name: string;
    description: string | null;
  } | null = null;

  try {
    // ロール情報をバックアップ（補償トランザクション用）
    const existingRole = await ctx.db.organizationRole.findUnique({
      where: {
        organizationSlug_slug: {
          organizationSlug: ctx.currentOrg.slug,
          slug: input.slug,
        },
      },
    });

    if (!existingRole) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "指定されたロールが見つかりません",
      });
    }

    roleBackup = {
      name: existingRole.name,
      description: existingRole.description,
    };

    // 1. Keycloakからグループロール削除
    // 作成時と同じ命名規則を使用: org:{orgSlug}:role:{roleSlug}
    const keycloak = KeycloakOrganizationProvider.fromEnv();
    const keycloakResult = await keycloak.deleteGroupRole(
      ctx.currentOrg.id,
      keycloakRoleName,
    );

    if (!keycloakResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Keycloakロールの削除に失敗しました: ${keycloakResult.error}`,
      });
    }

    roleDeleted = true;

    // 2. DBから削除（CASCADE: McpPermission自動削除）
    await ctx.db.organizationRole.delete({
      where: {
        organizationSlug_slug: {
          organizationSlug: ctx.currentOrg.slug,
          slug: input.slug,
        },
      },
    });

    // セキュリティアラート: 管理者に通知（非同期で実行）
    void createAdminNotifications(ctx.db, {
      type: "SECURITY_ROLE_DELETED",
      priority: "HIGH",
      title: "ロールが削除されました",
      message: `カスタムロール「${roleBackup.name}」（${input.slug}）が削除されました`,
      organizationId: ctx.currentOrg.id,
      triggeredById: ctx.session.user.id,
    });

    return { success: true };
  } catch (error) {
    // 補償トランザクション（Keycloakロール再作成）
    if (roleDeleted && roleBackup) {
      try {
        const keycloak = KeycloakOrganizationProvider.fromEnv();
        await keycloak.createGroupRole(ctx.currentOrg.id, {
          name: keycloakRoleName,
          description: roleBackup.description ?? undefined,
        });
        console.error(
          `Keycloak補償トランザクション実行: ${keycloakRoleName}`,
          error,
        );
      } catch (compensationError) {
        console.error(
          "Keycloak補償トランザクション失敗（手動復元が必要）:",
          compensationError,
        );
      }
    }

    if (error instanceof TRPCError) {
      throw error;
    }

    console.error("ロール削除エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ロールの削除中にエラーが発生しました",
    });
  }
};
