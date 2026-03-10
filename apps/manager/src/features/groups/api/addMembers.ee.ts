// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type {
  AddMembersInput,
  AddMembersResult,
} from "@/server/utils/groupSchemas";
import {
  validateOrganizationAccess,
  type OrganizationInfo,
} from "@/server/utils/organizationPermissions";

/**
 * グループへの複数メンバー一括追加（EE版）
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - group:manage 権限を確認
 * - データベースで組織の存在を確認
 * - 追加するユーザーが組織のメンバーであることを確認
 * - グループが組織のサブグループであることを確認
 * - Keycloakにユーザーをグループに追加（並列処理）
 */
export const addMembers = async (
  db: PrismaTransactionClient,
  input: AddMembersInput,
  currentOrg: OrganizationInfo,
): Promise<AddMembersResult> => {
  // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループにメンバーを追加することはできません",
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

  // 追加するユーザーが組織のメンバーであることを確認
  const organizationMembers = await db.organizationMember.findMany({
    where: {
      organizationId: input.organizationId,
      userId: { in: input.userIds },
    },
    select: { userId: true },
  });

  const validUserIds = new Set(organizationMembers.map((m) => m.userId));
  const invalidUserIds = input.userIds.filter(
    (userId) => !validUserIds.has(userId),
  );

  if (invalidUserIds.length > 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `以下のユーザーはこの組織のメンバーではありません: ${invalidUserIds.join(", ")}`,
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

  // グループが組織のサブグループであることを確認
  const groupsResult = await keycloakProvider.listSubgroups({
    organizationId: organization.id,
  });

  if (!groupsResult.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "グループの検証に失敗しました",
    });
  }

  // 再帰的にすべてのサブグループをチェック
  const isValidGroup = (
    groups: Array<{ id?: string; subGroups?: unknown[] }> | undefined,
    targetId: string,
  ): boolean => {
    if (!groups) return false;
    for (const group of groups) {
      if (group.id === targetId) return true;
      if (
        Array.isArray(group.subGroups) &&
        isValidGroup(
          group.subGroups as Array<{ id?: string; subGroups?: unknown[] }>,
          targetId,
        )
      ) {
        return true;
      }
    }
    return false;
  };

  if (!isValidGroup(groupsResult.subgroups, input.groupId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "指定されたグループはこの組織に属していません",
    });
  }

  // ユーザーを並列でグループに追加
  const results = await Promise.allSettled(
    input.userIds.map((userId) =>
      keycloakProvider.addUserToSubgroup({
        subgroupId: input.groupId,
        userId,
      }),
    ),
  );

  // 結果を集計
  const failedUserIds: string[] = [];
  let addedCount = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      addedCount++;
    } else {
      failedUserIds.push(input.userIds[index] ?? "");
    }
  });

  return {
    success: failedUserIds.length === 0,
    addedCount,
    failedUserIds,
  };
};
