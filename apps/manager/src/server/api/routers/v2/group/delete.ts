import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { DeleteGroupInput } from "../../../../utils/groupSchemas";

/**
 * グループ削除
 *
 * セキュリティ：
 * - データベースで組織の存在を確認
 * - 削除対象のグループが組織のサブグループであることを確認
 * - Keycloakからグループを削除
 */
export const deleteGroup = async (
  db: PrismaTransactionClient,
  input: DeleteGroupInput,
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

  // Keycloakプロバイダーを初期化
  const keycloakProvider = new KeycloakOrganizationProvider({
    baseUrl: process.env.KEYCLOAK_URL ?? "",
    realm: process.env.KEYCLOAK_REALM ?? "tumiki",
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME ?? "",
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "",
  });

  // 削除対象のグループが組織のサブグループであることを確認
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

  // グループを削除
  const result = await keycloakProvider.deleteSubgroup({
    subgroupId: input.groupId,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "グループの削除に失敗しました",
    });
  }

  return { success: true };
};
