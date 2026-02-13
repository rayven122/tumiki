// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import { createAdminNotifications } from "@/features/notification";

/**
 * メンバーロール変更入力スキーマ
 */
export const updateMemberRoleInputSchema = z.object({
  memberId: z.string(),
  newRole: z.enum(["Owner", "Admin", "Member", "Viewer"]),
});

/**
 * メンバーロール変更出力スキーマ
 */
export const updateMemberRoleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>;
export type UpdateMemberRoleOutput = z.infer<
  typeof updateMemberRoleOutputSchema
>;

/**
 * メンバーのロールを変更（EE版）
 *
 * @param input - メンバーIDと新しいロール
 * @param ctx - 保護されたコンテキスト
 * @returns 変更結果
 *
 * @throws NOT_FOUND - メンバーが存在しない
 * @throws FORBIDDEN - 管理者権限がない、または組織のメンバーではない
 * @throws BAD_REQUEST - 組織の作成者のロールは変更できない
 */
export const updateMemberRole = async ({
  input,
  ctx,
}: {
  input: UpdateMemberRoleInput;
  ctx: ProtectedContext;
}): Promise<UpdateMemberRoleOutput> => {
  try {
    // メンバーロール変更権限を検証
    validateOrganizationAccess(ctx.currentOrg, {
      requirePermission: "member:role:update",
      requireTeam: true,
    });

    // 対象メンバーを取得（ユーザー情報も含む）
    const targetMember = await ctx.db.organizationMember.findUnique({
      where: {
        id: input.memberId,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!targetMember) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "対象のメンバーが見つかりません",
      });
    }

    // 現在の組織のメンバーか確認
    if (targetMember.organizationId !== ctx.currentOrg.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "このチームのメンバーではありません",
      });
    }

    // 組織の作成者のロールは変更できない
    if (targetMember.userId === ctx.currentOrg.createdBy) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "組織の作成者のロールは変更できません",
      });
    }

    // Keycloakでロールを更新とセッション無効化を並列実行
    const provider = KeycloakOrganizationProvider.fromEnv();
    const [updateResult, invalidateResult] = await Promise.allSettled([
      provider.updateMemberRole({
        externalId: ctx.currentOrg.id, // Organization.idがKeycloak Group ID
        userId: targetMember.userId,
        newRole: input.newRole,
      }),
      provider.invalidateUserSessions({
        userId: targetMember.userId,
      }),
    ]);

    // ロール変更結果チェック
    if (updateResult.status === "rejected" || !updateResult.value.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Keycloakでのロール変更に失敗しました: ${
          updateResult.status === "rejected"
            ? updateResult.reason
            : updateResult.value.error
        }`,
      });
    }

    // セッション無効化結果チェック（警告のみ）
    if (
      invalidateResult.status === "rejected" ||
      !invalidateResult.value.success
    ) {
      // セッション無効化失敗は警告のみ（セッションは自動更新されるため非致命的）
      console.warn(
        `セッション無効化に失敗: ${
          invalidateResult.status === "rejected"
            ? invalidateResult.reason
            : invalidateResult.value.error
        }`,
      );
    }

    // セキュリティアラート: 管理者に通知（非同期で実行）
    const memberDisplayName =
      targetMember.user?.name ?? targetMember.user?.email ?? "不明";
    void createAdminNotifications(ctx.db, {
      type: "SECURITY_ROLE_ASSIGNED",
      priority: "HIGH",
      title: "メンバーのロールが変更されました",
      message: `${memberDisplayName} さんのロールが「${input.newRole}」に変更されました`,
      organizationId: ctx.currentOrg.id,
      triggeredById: ctx.session.user.id,
    });

    return {
      success: true,
      message: "メンバーのロールを変更しました",
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("ロール変更エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ロールの変更中にエラーが発生しました。",
    });
  }
};
