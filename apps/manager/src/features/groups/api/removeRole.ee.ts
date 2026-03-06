// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { RemoveRoleFromGroupInput } from "@/server/utils/groupSchemas";
import {
  validateOrganizationAccess,
  type OrganizationInfo,
} from "@/server/utils/organizationPermissions";

/**
 * グループからロールを解除（EE版）
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - group:manage 権限を確認
 * - 認証サーバーでグループからロールマッピングを削除
 */
export const removeRoleFromGroup = async (
  db: PrismaTransactionClient,
  input: RemoveRoleFromGroupInput,
  currentOrg: OrganizationInfo,
): Promise<{ success: boolean }> => {
  // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループからロールを解除することはできません",
    });
  }

  // セキュリティチェック2: グループ管理権限を検証
  validateOrganizationAccess(currentOrg, {
    requirePermission: "group:manage",
  });

  // 組織情報を取得
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { slug: true },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "組織が見つかりません",
    });
  }

  // 認証プロバイダーを初期化
  let keycloakProvider: KeycloakOrganizationProvider;
  try {
    keycloakProvider = KeycloakOrganizationProvider.fromEnv();
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error ? error.message : "認証サーバー設定が不完全です",
    });
  }

  // ロール名を構築（org:{orgSlug}:role:{roleSlug}形式）
  const keycloakRoleName = `org:${organization.slug}:role:${input.roleSlug}`;

  // グループからロールマッピングを削除
  const result = await keycloakProvider.removeRoleMappingFromGroup({
    groupId: input.groupId,
    roleName: keycloakRoleName,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "ロールの解除に失敗しました",
    });
  }

  return { success: true };
};
