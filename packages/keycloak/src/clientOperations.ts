import type KcAdminClient from "@keycloak/keycloak-admin-client";
import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import type { RoleMappingPayload } from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js";

import type { OrganizationRole } from "./types.js";

/**
 * グループを作成（フラット構造）
 */
export const createGroup = async (
  client: KcAdminClient,
  params: {
    name: string;
    attributes?: Record<string, string[]>;
  },
): Promise<{ groupId: string }> => {
  const response = await client.groups.create({
    name: params.name,
    attributes: params.attributes ?? {},
  });

  // レスポンスのidがgroupIdとして返される
  const groupId = response.id;

  if (!groupId) {
    throw new Error("Failed to extract group ID from response");
  }

  return { groupId };
};

/**
 * グループを削除
 */
export const deleteGroup = async (
  client: KcAdminClient,
  groupId: string,
): Promise<void> => {
  await client.groups.del({ id: groupId });
};

/**
 * サブグループを作成
 * @param client - Keycloak Admin Client
 * @param parentGroupId - 親グループID（組織のKeycloak Group ID）
 * @param params - サブグループ作成パラメータ
 * @returns サブグループID
 */
export const createSubgroup = async (
  client: KcAdminClient,
  parentGroupId: string,
  params: {
    name: string;
    attributes?: Record<string, string[]>;
  },
): Promise<{ subgroupId: string }> => {
  const response = await client.groups.createChildGroup(
    { id: parentGroupId },
    {
      name: params.name,
      attributes: params.attributes ?? {},
    },
  );

  const subgroupId = response.id;

  if (!subgroupId) {
    throw new Error("Failed to extract subgroup ID from response");
  }

  return { subgroupId };
};

/**
 * サブグループを削除
 */
export const deleteSubgroup = async (
  client: KcAdminClient,
  subgroupId: string,
): Promise<void> => {
  await client.groups.del({ id: subgroupId });
};

/**
 * グループ情報を取得（サブグループを再帰的に取得）
 *
 * 注意: Keycloak API の groups.findOne は subGroups を返さないため、
 * listSubGroups を使用してサブグループを別途取得する必要がある
 */
export const getGroup = async (
  client: KcAdminClient,
  groupId: string,
): Promise<GroupRepresentation> => {
  // グループの基本情報を取得
  const group = await client.groups.findOne({ id: groupId });

  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // listSubGroups APIを使用してサブグループを取得
  // （groups.findOne は subGroups を返さないため）
  const subGroups = await client.groups.listSubGroups({ parentId: groupId });

  // 各サブグループに対して再帰的に処理
  if (subGroups && subGroups.length > 0) {
    group.subGroups = await Promise.all(
      subGroups.map(async (subGroup) => {
        if (subGroup.id) {
          return getGroup(client, subGroup.id);
        }
        return subGroup;
      }),
    );
  } else {
    group.subGroups = [];
  }

  return group;
};

/**
 * グループのサブグループ一覧を取得（再帰的に全階層を取得）
 */
export const listSubgroups = async (
  client: KcAdminClient,
  parentGroupId: string,
): Promise<GroupRepresentation[]> => {
  const group = await getGroup(client, parentGroupId);
  return group.subGroups ?? [];
};

/**
 * ユーザーをグループに追加
 */
export const addUserToGroup = async (
  client: KcAdminClient,
  userId: string,
  groupId: string,
): Promise<void> => {
  await client.users.addToGroup({
    id: userId,
    groupId,
  });
};

/**
 * ユーザーをグループから削除
 */
export const removeUserFromGroup = async (
  client: KcAdminClient,
  userId: string,
  groupId: string,
): Promise<void> => {
  await client.users.delFromGroup({
    id: userId,
    groupId,
  });
};

/**
 * Realm Roleを取得
 */
export const getRealmRole = async (
  client: KcAdminClient,
  roleName: OrganizationRole,
): Promise<RoleRepresentation> => {
  const role = await client.roles.findOneByName({ name: roleName });

  if (!role) {
    throw new Error(`Role not found: ${roleName}`);
  }

  return role;
};

/**
 * デフォルトRealm Rolesが存在することを確認し、なければ作成
 * これらは全組織で共通して使用されるロール
 */
export const ensureDefaultRealmRolesExist = async (
  client: KcAdminClient,
): Promise<void> => {
  const defaultRoles: Array<{
    name: OrganizationRole;
    description: string;
  }> = [
    { name: "Owner", description: "組織オーナー - 全権限" },
    { name: "Admin", description: "組織管理者 - メンバー管理可能" },
    { name: "Member", description: "組織メンバー - 基本利用" },
    { name: "Viewer", description: "組織閲覧者 - 読み取り専用" },
  ];

  for (const roleInfo of defaultRoles) {
    // ロールが存在するかチェック
    const existingRole = await client.roles.findOneByName({
      name: roleInfo.name,
    });

    if (!existingRole) {
      // 存在しない場合は作成
      await client.roles.create({
        name: roleInfo.name,
        description: roleInfo.description,
      });
    }
  }
};

/**
 * ユーザーにRealm Roleを割り当て
 */
export const assignRealmRole = async (
  client: KcAdminClient,
  userId: string,
  role: RoleRepresentation,
): Promise<void> => {
  // RoleRepresentationをRoleMappingPayloadに変換
  if (!role.id || !role.name) {
    throw new Error("Role must have id and name");
  }

  await client.users.addRealmRoleMappings({
    id: userId,
    roles: [role as RoleMappingPayload],
  });
};

/**
 * ユーザーからRealm Roleを削除
 */
export const removeRealmRole = async (
  client: KcAdminClient,
  userId: string,
  role: RoleRepresentation,
): Promise<void> => {
  // RoleRepresentationをRoleMappingPayloadに変換
  if (!role.id || !role.name) {
    throw new Error("Role must have id and name");
  }

  await client.users.delRealmRoleMappings({
    id: userId,
    roles: [role as RoleMappingPayload],
  });
};

/**
 * ユーザーの現在のRealm Rolesを取得
 */
export const getUserRealmRoles = async (
  client: KcAdminClient,
  userId: string,
): Promise<RoleRepresentation[]> => {
  const roles = await client.users.listRealmRoleMappings({
    id: userId,
  });
  return roles;
};

/**
 * ユーザーの全セッションを無効化
 */
export const invalidateUserSessions = async (
  client: KcAdminClient,
  userId: string,
): Promise<void> => {
  await client.users.logout({ id: userId });
};

/**
 * グループロールを作成
 * 実際にはRealm Roleとして作成する
 *
 * ロール名は呼び出し側が適切な命名規則で渡す
 * 例: "org:rayven:role:data-engineer"
 *
 * @param client - Keycloak Admin Client
 * @param groupId - グループID（属性に保存用）
 * @param params.name - ロール名（呼び出し側で命名規則を適用済み）
 * @param params.description - ロールの説明
 */
export const createGroupRole = async (
  client: KcAdminClient,
  groupId: string,
  params: {
    name: string;
    description?: string;
  },
): Promise<{ roleId: string }> => {
  // 重複チェック：既に同じ名前のロールが存在する場合はエラー
  const existingRole = await client.roles.findOneByName({
    name: params.name,
  });
  if (existingRole) {
    throw new Error(`ロール "${params.name}" は既に存在します`);
  }

  const response = await client.roles.create({
    name: params.name,
    description: params.description,
    attributes: {
      groupId: [groupId], // グループIDを属性に保存（参照用）
    },
  });

  const roleId = response.roleName;

  if (!roleId) {
    throw new Error("Failed to extract role ID from response");
  }

  return { roleId };
};

/**
 * グループロール一覧を取得
 * グループの属性に保存されたロールを返す
 *
 * 注意: この関数は現在使用されていません。
 * 組織ロール一覧は listOrganizationRoleMappingsForGroup を使用してください。
 */
export const listGroupRoles = async (
  client: KcAdminClient,
  groupId: string,
): Promise<RoleRepresentation[]> => {
  // グループにマッピングされたRealm Rolesを取得
  const allRoles = await client.groups.listRealmRoleMappings({ id: groupId });

  // groupId属性を持つロールのみをフィルタ
  const groupRoles = allRoles.filter(
    (role) => role.attributes?.groupId?.[0] === groupId,
  );

  return groupRoles;
};

/**
 * グループロールを削除
 * 実際にはRealm Roleを削除する
 *
 * @param client - Keycloak Admin Client
 * @param _groupId - グループID（互換性のため保持、未使用）
 * @param roleName - 削除するロール名（例: "org:rayven:role:data-engineer"）
 */
export const deleteGroupRole = async (
  client: KcAdminClient,
  _groupId: string,
  roleName: string,
): Promise<void> => {
  // Realm Roleを削除（呼び出し側が完全なロール名を渡す）
  await client.roles.delByName({ name: roleName });
};

/**
 * ユーザーにグループロールを割り当て
 * 実際にはユーザーにRealm Roleを割り当てる
 *
 * @param client - Keycloak Admin Client
 * @param _groupId - グループID（互換性のため保持、未使用）
 * @param userId - ユーザーID
 * @param roleName - ロール名（例: "org:rayven:role:data-engineer"）
 */
export const assignGroupRoleToUser = async (
  client: KcAdminClient,
  _groupId: string,
  userId: string,
  roleName: string,
): Promise<void> => {
  // Realm Roleを取得（呼び出し側が完全なロール名を渡す）
  const role = await client.roles.findOneByName({ name: roleName });

  if (!role?.id || !role.name) {
    throw new Error(`Role not found: ${roleName}`);
  }

  // ユーザーにRealm Roleを割り当て
  await client.users.addRealmRoleMappings({
    id: userId,
    roles: [role as RoleMappingPayload],
  });
};

/**
 * ユーザーからグループロールを削除
 * 実際にはユーザーからRealm Roleを削除する
 *
 * @param client - Keycloak Admin Client
 * @param _groupId - グループID（互換性のため保持、未使用）
 * @param userId - ユーザーID
 * @param roleName - ロール名（例: "org:rayven:role:data-engineer"）
 */
export const removeGroupRoleFromUser = async (
  client: KcAdminClient,
  _groupId: string,
  userId: string,
  roleName: string,
): Promise<void> => {
  // Realm Roleを取得（呼び出し側が完全なロール名を渡す）
  const role = await client.roles.findOneByName({ name: roleName });

  if (!role?.id || !role.name) {
    throw new Error(`Role not found: ${roleName}`);
  }

  // ユーザーからRealm Roleを削除
  await client.users.delRealmRoleMappings({
    id: userId,
    roles: [role as RoleMappingPayload],
  });
};

/**
 * ユーザーのカスタム属性を更新
 */
export const updateUserAttributes = async (
  client: KcAdminClient,
  userId: string,
  attributes: Record<string, string[]>,
): Promise<void> => {
  // ユーザーの現在の属性を取得
  const user = await client.users.findOne({ id: userId });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 属性をマージして更新
  await client.users.update(
    { id: userId },
    {
      attributes: {
        ...(user.attributes ?? {}),
        ...attributes,
      },
    },
  );
};

/**
 * グループのメンバー一覧を取得
 */
export const listGroupMembers = async (
  client: KcAdminClient,
  groupId: string,
): Promise<UserRepresentation[]> => {
  const members = await client.groups.listMembers({ id: groupId });
  return members;
};

/**
 * サブグループを別の親に移動
 * Keycloak の updateChildGroup API を使用
 *
 * @param client - Keycloak Admin Client
 * @param groupId - 移動するグループのID
 * @param newParentGroupId - 新しい親グループのID
 */
export const moveSubgroup = async (
  client: KcAdminClient,
  groupId: string,
  newParentGroupId: string,
): Promise<void> => {
  // 移動するグループの情報を取得
  const group = await client.groups.findOne({ id: groupId });

  if (!group || !group.name) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // updateChildGroup: 既存のグループを新しい親に移動する
  // id: 新しい親グループのID
  // payload: 移動するグループの情報（idとnameが必須）
  await client.groups.updateChildGroup(
    { id: newParentGroupId },
    { id: groupId, name: group.name },
  );
};

/**
 * グループの属性を更新
 * 既存の属性とマージして更新する
 *
 * @param client - Keycloak Admin Client
 * @param groupId - 更新するグループのID
 * @param attributes - 更新する属性（既存の属性とマージされる）
 */
export const updateGroupAttributes = async (
  client: KcAdminClient,
  groupId: string,
  attributes: Record<string, string[]>,
): Promise<void> => {
  // グループの現在の情報を取得
  const group = await client.groups.findOne({ id: groupId });

  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // 属性をマージして更新
  await client.groups.update(
    { id: groupId },
    {
      ...group,
      attributes: {
        ...(group.attributes ?? {}),
        ...attributes,
      },
    },
  );
};

/**
 * グループを更新（名前と属性）
 *
 * @param client - Keycloak Admin Client
 * @param groupId - 更新するグループのID
 * @param params - 更新するパラメータ
 */
export const updateGroup = async (
  client: KcAdminClient,
  groupId: string,
  params: {
    name?: string;
    attributes?: Record<string, string[]>;
  },
): Promise<void> => {
  // グループの現在の情報を取得
  const group = await client.groups.findOne({ id: groupId });

  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // 名前と属性を更新
  await client.groups.update(
    { id: groupId },
    {
      ...group,
      name: params.name ?? group.name,
      attributes: params.attributes
        ? {
            ...(group.attributes ?? {}),
            ...params.attributes,
          }
        : group.attributes,
    },
  );
};

/**
 * グループにRealm Roleをマッピング
 * 組織のカスタムロール（org:{orgSlug}:role:{roleSlug}形式）をグループに割り当てる
 *
 * @param client - Keycloak Admin Client
 * @param groupId - ロールを割り当てるグループのID
 * @param roleName - Realm Role名（例: "org:my-company:role:data-engineer"）
 */
export const addRoleMappingToGroup = async (
  client: KcAdminClient,
  groupId: string,
  roleName: string,
): Promise<void> => {
  // Realm Roleを取得
  const role = await client.roles.findOneByName({ name: roleName });

  if (!role?.id || !role.name) {
    throw new Error(`Role not found: ${roleName}`);
  }

  // グループにRealm Roleをマッピング
  await client.groups.addRealmRoleMappings({
    id: groupId,
    roles: [role as RoleMappingPayload],
  });
};

/**
 * グループからRealm Roleマッピングを削除
 *
 * @param client - Keycloak Admin Client
 * @param groupId - ロールマッピングを削除するグループのID
 * @param roleName - 削除するRealm Role名
 */
export const removeRoleMappingFromGroup = async (
  client: KcAdminClient,
  groupId: string,
  roleName: string,
): Promise<void> => {
  // Realm Roleを取得
  const role = await client.roles.findOneByName({ name: roleName });

  if (!role?.id || !role.name) {
    throw new Error(`Role not found: ${roleName}`);
  }

  // グループからRealm Roleマッピングを削除
  await client.groups.delRealmRoleMappings({
    id: groupId,
    roles: [role as RoleMappingPayload],
  });
};

/**
 * グループにマッピングされた組織ロール一覧を取得
 * org:{orgSlug}:role:{roleSlug} 形式のロールのみをフィルタして返す
 *
 * @param client - Keycloak Admin Client
 * @param groupId - グループID
 * @param orgSlug - 組織スラッグ（フィルタ用）
 * @returns 組織ロールの一覧（roleSlugのみ抽出）
 */
export const listOrganizationRoleMappingsForGroup = async (
  client: KcAdminClient,
  groupId: string,
  orgSlug: string,
): Promise<{ roleSlug: string; roleName: string }[]> => {
  // グループにマッピングされたすべてのRealm Rolesを取得
  const allRoles = await client.groups.listRealmRoleMappings({ id: groupId });

  // org:{orgSlug}:role:{roleSlug} 形式のロールのみをフィルタ
  const prefix = `org:${orgSlug}:role:`;
  const orgRoles = allRoles.filter(
    (role) => role.name && role.name.startsWith(prefix),
  );

  // roleSlugを抽出して返す
  return orgRoles
    .filter((role) => role.name)
    .map((role) => ({
      roleSlug: role.name!.substring(prefix.length),
      roleName: role.name!,
    }));
};
