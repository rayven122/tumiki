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
 * 実際にはRealm Roleとして作成し、グループにマッピングする
 * ロール名には組織IDをプレフィックスとして使用（例: "org_abc123_engineering_manager"）
 */
export const createGroupRole = async (
  client: KcAdminClient,
  groupId: string,
  params: {
    name: string;
    description?: string;
    attributes?: Record<string, string[]>;
  },
): Promise<{ roleId: string }> => {
  // ロール名のバリデーション：アンダースコアを含む場合は拒否
  if (params.name.includes("_")) {
    throw new Error("ロール名にアンダースコア(_)を含めることはできません");
  }

  // 1. Realm Roleを作成（ロール名にグループIDをプレフィックス）
  const roleNameWithPrefix = `group_${groupId}_${params.name}`;

  // 重複チェック：既に同じ名前のロールが存在する場合はエラー
  const existingRole = await client.roles.findOneByName({
    name: roleNameWithPrefix,
  });
  if (existingRole) {
    throw new Error(`ロール "${params.name}" は既に存在します`);
  }

  const response = await client.roles.create({
    name: roleNameWithPrefix,
    description: params.description,
    attributes: {
      ...params.attributes,
      groupId: [groupId], // グループIDを属性に保存
      originalName: [params.name], // 元のロール名を保存
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
 * グループにマッピングされたRealm Rolesのうち、
 * グループIDをプレフィックスに持つロールを返す
 */
export const listGroupRoles = async (
  client: KcAdminClient,
  groupId: string,
): Promise<RoleRepresentation[]> => {
  // グループにマッピングされたRealm Rolesを取得
  const allRoles = await client.groups.listRealmRoleMappings({ id: groupId });

  // グループIDをプレフィックスに持つロールのみをフィルタ
  const groupRoles = allRoles.filter(
    (role) => role.name && role.name.startsWith(`group_${groupId}_`),
  );

  // ロール名からプレフィックスを除去して返す
  const rolesWithOriginalNames = groupRoles.map((role) => ({
    ...role,
    name: role.attributes?.originalName?.[0] || role.name,
  }));

  return rolesWithOriginalNames;
};

/**
 * グループロールを削除
 * 実際にはRealm Roleを削除する
 */
export const deleteGroupRole = async (
  client: KcAdminClient,
  groupId: string,
  roleName: string,
): Promise<void> => {
  // プレフィックス付きのロール名を作成
  const roleNameWithPrefix = `group_${groupId}_${roleName}`;

  // Realm Roleを削除
  await client.roles.delByName({ name: roleNameWithPrefix });
};

/**
 * ユーザーにグループロールを割り当て
 * 実際にはユーザーにRealm Roleを割り当てる
 */
export const assignGroupRoleToUser = async (
  client: KcAdminClient,
  groupId: string,
  userId: string,
  roleName: string,
): Promise<void> => {
  // プレフィックス付きのロール名を作成
  const roleNameWithPrefix = `group_${groupId}_${roleName}`;

  // Realm Roleを取得
  const role = await client.roles.findOneByName({ name: roleNameWithPrefix });

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
 */
export const removeGroupRoleFromUser = async (
  client: KcAdminClient,
  groupId: string,
  userId: string,
  roleName: string,
): Promise<void> => {
  // プレフィックス付きのロール名を作成
  const roleNameWithPrefix = `group_${groupId}_${roleName}`;

  // Realm Roleを取得
  const role = await client.roles.findOneByName({ name: roleNameWithPrefix });

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
