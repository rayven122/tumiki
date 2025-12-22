import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { AddMemberInput } from "../../../../utils/groupSchemas";

/**
 * グループメンバー追加
 *
 * セキュリティ：
 * - データベースで組織の存在を確認
 * - 追加するユーザーが組織のメンバーであることを確認
 * - グループが組織のサブグループであることを確認
 * - Keycloakにユーザーをグループに追加
 */
export const addMember = async (
  db: PrismaTransactionClient,
  input: AddMemberInput,
): Promise<{ success: boolean }> => {
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
  const organizationMember = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
  });

  if (!organizationMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "指定されたユーザーはこの組織のメンバーではありません",
    });
  }

  // Keycloakプロバイダーを初期化
  const keycloakProvider = new KeycloakOrganizationProvider({
    baseUrl: process.env.KEYCLOAK_URL ?? "",
    realm: process.env.KEYCLOAK_REALM ?? "tumiki",
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME ?? "",
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "",
  });

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

  // ユーザーをグループに追加
  const result = await keycloakProvider.addUserToSubgroup({
    subgroupId: input.groupId,
    userId: input.userId,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "メンバーの追加に失敗しました",
    });
  }

  return { success: true };
};
