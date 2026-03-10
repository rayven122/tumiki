// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { UpdateGroupInput } from "@/server/utils/groupSchemas";
import {
  validateOrganizationAccess,
  type OrganizationInfo,
} from "@/server/utils/organizationPermissions";

/**
 * グループ更新（EE版）
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - group:manage 権限を確認
 * - データベースで組織の存在を確認
 * - Keycloakでグループを更新
 */
export const updateGroup = async (
  db: PrismaTransactionClient,
  input: UpdateGroupInput,
  currentOrg: OrganizationInfo,
): Promise<{ success: boolean }> => {
  // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループを更新することはできません",
    });
  }

  // セキュリティチェック2: グループ管理権限を検証
  validateOrganizationAccess(currentOrg, {
    requirePermission: "group:manage",
  });

  // データベースで組織の存在を確認
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "組織が見つかりません",
    });
  }

  // Keycloakプロバイダーを初期化（環境変数から自動設定）
  let keycloakProvider: KeycloakOrganizationProvider;
  try {
    keycloakProvider = KeycloakOrganizationProvider.fromEnv();
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error ? error.message : "Keycloak設定が不完全です",
    });
  }

  // 更新する属性を構築
  const attributes: Record<string, string[]> = {};
  if (input.icon !== undefined) {
    attributes.icon = input.icon ? [input.icon] : [];
  }

  // グループを更新
  const result = await keycloakProvider.updateSubgroup({
    subgroupId: input.groupId,
    name: input.name,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "グループの更新に失敗しました",
    });
  }

  return { success: true };
};
