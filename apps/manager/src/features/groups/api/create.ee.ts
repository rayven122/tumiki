// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { CreateGroupInput } from "@/server/utils/groupSchemas";
import {
  validateOrganizationAccess,
  type OrganizationInfo,
} from "@/server/utils/organizationPermissions";

/**
 * グループ作成（EE版）
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - group:manage 権限を確認
 * - データベースで組織の存在を確認
 * - parentGroupIdが指定されている場合、同じ組織配下であることを確認
 * - Keycloakにサブグループを作成
 */
export const createGroup = async (
  db: PrismaTransactionClient,
  input: CreateGroupInput,
  currentOrg: OrganizationInfo,
): Promise<{ id: string; name: string }> => {
  // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織にグループを作成することはできません",
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

  // parentGroupIdが指定されている場合、それが同じ組織配下であることを確認
  if (input.parentGroupId) {
    const parentGroupsResult = await keycloakProvider.listSubgroups({
      organizationId: organization.id,
    });

    if (!parentGroupsResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "親グループの検証に失敗しました",
      });
    }

    // 再帰的にすべてのサブグループをチェック
    const isValidParent = (
      groups: Array<{ id?: string; subGroups?: unknown[] }> | undefined,
      targetId: string,
    ): boolean => {
      if (!groups) return false;
      for (const group of groups) {
        if (group.id === targetId) return true;
        if (
          Array.isArray(group.subGroups) &&
          isValidParent(
            group.subGroups as Array<{ id?: string; subGroups?: unknown[] }>,
            targetId,
          )
        ) {
          return true;
        }
      }
      return false;
    };

    if (!isValidParent(parentGroupsResult.subgroups, input.parentGroupId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "指定された親グループはこの組織に属していません",
      });
    }
  }

  // 属性を構築（アイコンが指定されている場合）
  const attributes: Record<string, string[]> = {};
  if (input.icon) {
    attributes.icon = [input.icon];
  }

  // サブグループを作成
  const result = await keycloakProvider.createSubgroup({
    organizationId: organization.id,
    name: input.name,
    parentSubgroupId: input.parentGroupId,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "グループの作成に失敗しました",
    });
  }

  return {
    id: result.subgroupId,
    name: input.name,
  };
};
