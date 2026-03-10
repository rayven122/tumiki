// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { MoveGroupInput } from "@/server/utils/groupSchemas";
import {
  validateOrganizationAccess,
  type OrganizationInfo,
} from "@/server/utils/organizationPermissions";

/**
 * グループ移動（親グループの変更）（EE版）
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - group:manage 権限を確認
 * - データベースで組織の存在を確認
 * - 移動対象のグループが組織のサブグループであることを確認
 * - 新しい親グループが組織のサブグループ（またはルート）であることを確認
 * - 循環参照を防止（自分自身の子孫への移動を禁止）
 * - Keycloakでグループを移動
 */
export const moveGroup = async (
  db: PrismaTransactionClient,
  input: MoveGroupInput,
  currentOrg: OrganizationInfo,
): Promise<{ success: boolean }> => {
  // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループを移動することはできません",
    });
  }

  // セキュリティチェック2: グループ管理権限を検証
  validateOrganizationAccess(currentOrg, {
    requirePermission: "group:manage",
  });
  // データベースで組織の存在を確認
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, slug: true },
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

  // 組織のサブグループ一覧を取得
  const groupsResult = await keycloakProvider.listSubgroups({
    organizationId: organization.id,
  });

  if (!groupsResult.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "グループの検証に失敗しました",
    });
  }

  // グループIDからグループを探す再帰関数
  type GroupLike = { id?: string; subGroups?: GroupLike[] };
  const findGroup = (
    groups: GroupLike[] | undefined,
    targetId: string,
  ): GroupLike | null => {
    if (!groups) return null;
    for (const group of groups) {
      if (group.id === targetId) return group;
      const found = findGroup(group.subGroups, targetId);
      if (found) return found;
    }
    return null;
  };

  // 移動対象のグループが組織のサブグループであることを確認
  const targetGroup = findGroup(groupsResult.subgroups, input.groupId);
  if (!targetGroup) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "指定されたグループはこの組織に属していません",
    });
  }

  // 新しい親グループが組織ルートか、組織のサブグループであることを確認
  const isNewParentValid =
    input.newParentGroupId === organization.id ||
    findGroup(groupsResult.subgroups, input.newParentGroupId) !== null;

  if (!isNewParentValid) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "新しい親グループはこの組織に属していません",
    });
  }

  // 循環参照チェック：新しい親が移動対象の子孫ではないことを確認
  const isDescendant = (
    group: GroupLike | undefined,
    targetId: string,
  ): boolean => {
    if (!group?.subGroups) return false;
    for (const child of group.subGroups) {
      if (child.id === targetId) return true;
      if (isDescendant(child, targetId)) return true;
    }
    return false;
  };

  if (isDescendant(targetGroup, input.newParentGroupId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "グループを自分自身の子孫に移動することはできません",
    });
  }

  // グループを移動
  const result = await keycloakProvider.moveSubgroup({
    groupId: input.groupId,
    newParentGroupId: input.newParentGroupId,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "グループの移動に失敗しました",
    });
  }

  return { success: true };
};
