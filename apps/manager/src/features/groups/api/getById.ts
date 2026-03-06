import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import { KeycloakAdminClient } from "@tumiki/keycloak";
import type { GetGroupByIdInput } from "@/server/utils/groupSchemas";
import type { KeycloakGroup } from "@tumiki/keycloak";
import type { OrganizationInfo } from "@/server/utils/organizationPermissions";

/**
 * グループ詳細取得
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - データベースで組織の存在を確認
 * - 取得対象のグループが組織のサブグループであることを確認
 * - Keycloakからグループ詳細を取得
 */
export const getGroupById = async (
  db: PrismaTransactionClient,
  input: GetGroupByIdInput,
  currentOrg: OrganizationInfo,
): Promise<KeycloakGroup> => {
  // セキュリティチェック: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループにアクセスすることはできません",
    });
  }
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

  // 取得対象のグループが組織のサブグループであることを確認
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

  // Keycloak Admin Clientを直接使用してグループ詳細を取得
  const keycloakClient = new KeycloakAdminClient({
    baseUrl: process.env.KEYCLOAK_URL ?? "",
    realm: process.env.KEYCLOAK_REALM ?? "tumiki",
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME ?? "",
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "",
  });

  try {
    const group = await keycloakClient.getGroup(input.groupId);
    return group;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error ? error.message : "グループの取得に失敗しました",
    });
  }
};
