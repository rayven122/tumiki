import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type {
  ListAllGroupRolesInput,
  GroupRoleOutput,
} from "@/server/utils/groupSchemas";
import {
  validateOrganizationAccess,
  type OrganizationInfo,
} from "@/server/utils/organizationPermissions";

/**
 * 複数グループに割り当てられたロール一覧を一括取得
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - 組織メンバーであれば閲覧可能
 * - 認証サーバーからロールマッピングを取得し、DBからロール詳細を取得
 *
 * @returns グループIDをキーとしたロール配列のマップ
 */
export const listAllGroupRoles = async (
  db: PrismaTransactionClient,
  input: ListAllGroupRolesInput,
  currentOrg: OrganizationInfo,
): Promise<Record<string, GroupRoleOutput[]>> => {
  // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループのロールを取得することはできません",
    });
  }

  // セキュリティチェック2: 組織メンバーであることを確認（閲覧権限）
  validateOrganizationAccess(currentOrg);

  // グループIDが空の場合は空オブジェクトを返す
  if (input.groupIds.length === 0) {
    return {};
  }

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

  // 全グループのロールマッピングを並列取得
  const roleMappingPromises = input.groupIds.map(async (groupId) => {
    const result = await keycloakProvider.listOrganizationRoleMappingsForGroup({
      groupId,
      orgSlug: organization.slug,
    });

    return {
      groupId,
      roles: result.success ? (result.roles ?? []) : [],
    };
  });

  const roleMappingResults = await Promise.all(roleMappingPromises);

  // 全てのロールスラッグを収集
  const allRoleSlugs = new Set<string>();
  for (const result of roleMappingResults) {
    for (const role of result.roles) {
      allRoleSlugs.add(role.roleSlug);
    }
  }

  // ロールスラッグが空の場合は空のマップを返す
  if (allRoleSlugs.size === 0) {
    const emptyResult: Record<string, GroupRoleOutput[]> = {};
    for (const groupId of input.groupIds) {
      emptyResult[groupId] = [];
    }
    return emptyResult;
  }

  // DBからロール詳細を一括取得
  const roles = await db.organizationRole.findMany({
    where: {
      organizationSlug: organization.slug,
      slug: { in: [...allRoleSlugs] },
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
  const roleDetailMap = new Map(roles.map((r) => [r.slug, r]));

  // 結果を構築
  const result: Record<string, GroupRoleOutput[]> = {};
  for (const { groupId, roles: groupRoles } of roleMappingResults) {
    result[groupId] = groupRoles
      .map((mapping) => roleDetailMap.get(mapping.roleSlug))
      .filter((role): role is NonNullable<typeof role> => role !== undefined)
      .map((role) => ({
        roleSlug: role.slug,
        name: role.name,
        description: role.description,
        defaultRead: role.defaultRead,
        defaultWrite: role.defaultWrite,
        defaultExecute: role.defaultExecute,
      }));
  }

  return result;
};
