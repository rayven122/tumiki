import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type {
  ListGroupRolesInput,
  GroupRoleOutput,
} from "@/server/utils/groupSchemas";
import {
  validateOrganizationAccess,
  type OrganizationInfo,
} from "@/server/utils/organizationPermissions";

/**
 * グループに割り当てられたロール一覧を取得
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - 組織メンバーであれば閲覧可能
 * - 認証サーバーからロールマッピングを取得し、DBからロール詳細を取得
 */
export const listGroupRoles = async (
  db: PrismaTransactionClient,
  input: ListGroupRolesInput,
  currentOrg: OrganizationInfo,
): Promise<GroupRoleOutput[]> => {
  // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループのロールを取得することはできません",
    });
  }

  // セキュリティチェック2: 組織メンバーであることを確認（閲覧権限）
  validateOrganizationAccess(currentOrg);

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

  // グループに割り当てられたロールマッピングを取得
  const result = await keycloakProvider.listOrganizationRoleMappingsForGroup({
    groupId: input.groupId,
    orgSlug: organization.slug,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "ロール一覧の取得に失敗しました",
    });
  }

  const roleMappings = result.roles ?? [];

  // ロールマッピングが空の場合は空配列を返す
  if (roleMappings.length === 0) {
    return [];
  }

  // DBからロール詳細を取得
  const roleSlugs = roleMappings.map((r) => r.roleSlug);
  const roles = await db.organizationRole.findMany({
    where: {
      organizationSlug: organization.slug,
      slug: { in: roleSlugs },
    },
    select: {
      slug: true,
      name: true,
      description: true,
      defaultRead: true,
      defaultWrite: true,
      defaultExecute: true,
    },
  });

  // roleSlugをキーにしたマップを作成
  const roleMap = new Map(roles.map((r) => [r.slug, r]));

  // ロールマッピングの順序でロール詳細を返す
  return roleMappings
    .map((mapping) => roleMap.get(mapping.roleSlug))
    .filter((role): role is NonNullable<typeof role> => role !== undefined)
    .map((role) => ({
      roleSlug: role.slug,
      name: role.name,
      description: role.description,
      defaultRead: role.defaultRead,
      defaultWrite: role.defaultWrite,
      defaultExecute: role.defaultExecute,
    }));
};
