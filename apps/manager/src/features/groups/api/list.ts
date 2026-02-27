import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { ListGroupsInput } from "@/server/utils/groupSchemas";
import type { KeycloakGroup } from "@tumiki/keycloak";
import type { OrganizationInfo } from "@/server/utils/organizationPermissions";

/**
 * ロールサブグループ名のプレフィックス
 * 例: _Owner, _Admin, _Member, _Viewer
 */
const ROLE_SUBGROUP_PREFIX = "_";

/**
 * ロールサブグループを再帰的に除外
 * ロールサブグループはKeycloak内部で権限管理に使用されるため、
 * org-structure等の部署表示には含めない
 */
const filterRoleSubgroups = (group: KeycloakGroup): KeycloakGroup => ({
  ...group,
  subGroups: group.subGroups
    ?.filter((sg) => !sg.name?.startsWith(ROLE_SUBGROUP_PREFIX))
    .map(filterRoleSubgroups),
});

/**
 * グループ一覧取得
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - データベースで組織の存在を確認
 * - Keycloakから組織のサブグループ一覧を取得
 */
export const listGroups = async (
  db: PrismaTransactionClient,
  input: ListGroupsInput,
  currentOrg: OrganizationInfo,
): Promise<KeycloakGroup[]> => {
  // セキュリティチェック: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループにアクセスすることはできません",
    });
  }
  // データベースで組織の存在を確認（表示名も取得）
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, slug: true, name: true },
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

  // 組織グループ自体の情報を取得
  const orgGroupResult = await keycloakProvider.getGroup({
    groupId: organization.id,
  });

  if (!orgGroupResult.success || !orgGroupResult.group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: orgGroupResult.error ?? "組織グループが見つかりません",
    });
  }

  // 組織グループをルートノードとして返す（subGroupsはKeycloakが自動的に含めている）
  // ルートグループの名前はデータベースの組織名（表示名）を使用
  // ロールサブグループ（_Owner, _Admin等）は除外
  return [
    filterRoleSubgroups({
      ...orgGroupResult.group,
      name: organization.name,
    }),
  ];
};
