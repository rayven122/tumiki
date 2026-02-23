import type { KeycloakAdminClient } from "./client.js";
import type { OrganizationRole } from "./types.js";

/**
 * ロールサブグループ名のプレフィックス
 * 例: /_Owner, /_Admin, /_Member, /_Viewer
 */
const ROLE_SUBGROUP_PREFIX = "_";

/**
 * 組織ロール一覧
 */
const ORGANIZATION_ROLES: OrganizationRole[] = [
  "Owner",
  "Admin",
  "Member",
  "Viewer",
];

/**
 * ロールサブグループ名を生成
 * @param role - 組織ロール
 * @returns サブグループ名（例: "_Owner"）
 */
const getRoleSubgroupName = (role: OrganizationRole): string =>
  `${ROLE_SUBGROUP_PREFIX}${role}`;

/**
 * 組織のロールサブグループを作成し、Realm Roleをマッピング
 *
 * @param client - Keycloak Admin Client
 * @param organizationGroupId - 組織グループID
 */
export const createRoleSubgroups = async (
  client: KeycloakAdminClient,
  organizationGroupId: string,
): Promise<void> => {
  for (const role of ORGANIZATION_ROLES) {
    const subgroupName = getRoleSubgroupName(role);

    // 1. サブグループを作成
    const subgroupId = await client.createSubgroup(organizationGroupId, {
      name: subgroupName,
    });

    // 2. Realm Roleをサブグループにマッピング
    // これにより、サブグループのメンバーは自動的にこのロールを継承
    await client.addRoleMappingToGroup(subgroupId, role);
  }
};

/**
 * 組織のロールサブグループIDを取得
 *
 * @param client - Keycloak Admin Client
 * @param organizationGroupId - 組織グループID
 * @param role - 取得するロール
 * @returns サブグループID
 */
export const getRoleSubgroupId = async (
  client: KeycloakAdminClient,
  organizationGroupId: string,
  role: OrganizationRole,
): Promise<string> => {
  const subgroups = await client.listSubgroups(organizationGroupId);
  const targetName = getRoleSubgroupName(role);

  const subgroup = subgroups.find((sg) => sg.name === targetName);

  if (!subgroup?.id) {
    throw new Error(
      `Role subgroup "${targetName}" not found in organization group ${organizationGroupId}`,
    );
  }

  return subgroup.id;
};

/**
 * ユーザーを組織に追加（ロールサブグループ方式）
 *
 * ユーザーを適切なロールサブグループに追加することで、
 * 組織別のロールを管理します。
 */
export const addMember = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  },
): Promise<void> => {
  // 1. ロールサブグループIDを取得
  const roleSubgroupId = await getRoleSubgroupId(
    client,
    params.externalId,
    params.role,
  );

  // 2. ユーザーをロールサブグループに追加
  // サブグループにマッピングされたRealm Roleが自動的に継承される
  await client.addUserToGroup(params.userId, roleSubgroupId);
};

/**
 * 組織グループを作成（ロールサブグループ方式）
 *
 * 組織グループとロールサブグループ（_Owner, _Admin, _Member, _Viewer）を作成し、
 * 各サブグループにRealm Roleをマッピングします。
 */
export const createOrganization = async (
  client: KeycloakAdminClient,
  params: {
    name: string;
    groupName: string;
    ownerId: string;
  },
  addMemberFn: (params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  }) => Promise<void>,
): Promise<string> => {
  // 1. Keycloakに組織グループを作成
  const groupId = await client.createGroup({
    name: params.groupName,
    attributes: {
      displayName: [params.name],
    },
  });

  try {
    // 2. ロールサブグループを作成し、Realm Roleをマッピング
    await createRoleSubgroups(client, groupId);

    // 3. Ownerをロールサブグループに追加
    await addMemberFn({
      externalId: groupId,
      userId: params.ownerId,
      role: "Owner",
    });
  } catch (error) {
    // 失敗時はグループを削除してロールバック
    await client.deleteGroup(groupId);
    throw error;
  }

  return groupId;
};

/**
 * 組織グループを削除
 */
export const deleteOrganization = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
  },
): Promise<void> => {
  await client.deleteGroup(params.externalId);
};

/**
 * ユーザーを組織から削除（ロールサブグループ方式）
 *
 * ユーザーを全てのロールサブグループから削除します。
 */
export const removeMember = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
    userId: string;
  },
): Promise<void> => {
  // 1. 組織の全ロールサブグループからユーザーを削除
  for (const role of ORGANIZATION_ROLES) {
    try {
      const subgroupId = await getRoleSubgroupId(
        client,
        params.externalId,
        role,
      );
      await client.removeUserFromGroup(params.userId, subgroupId);
    } catch {
      // サブグループが見つからない場合は無視（ユーザーがそのロールを持っていない）
    }
  }

  // 2. セッションを無効化（即時反映）
  await client.invalidateUserSessions(params.userId);
};

/**
 * ユーザーのロールを更新（ロールサブグループ方式）
 *
 * ユーザーを古いロールサブグループから削除し、新しいロールサブグループに追加します。
 */
export const updateMemberRole = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
    userId: string;
    newRole: OrganizationRole;
  },
): Promise<void> => {
  // 1. 全てのロールサブグループからユーザーを削除
  for (const role of ORGANIZATION_ROLES) {
    try {
      const subgroupId = await getRoleSubgroupId(
        client,
        params.externalId,
        role,
      );
      await client.removeUserFromGroup(params.userId, subgroupId);
    } catch {
      // サブグループが見つからない、またはユーザーがメンバーでない場合は無視
    }
  }

  // 2. 新しいロールサブグループにユーザーを追加
  const newSubgroupId = await getRoleSubgroupId(
    client,
    params.externalId,
    params.newRole,
  );
  await client.addUserToGroup(params.userId, newSubgroupId);

  // 3. セッションを無効化（即時反映）
  await client.invalidateUserSessions(params.userId);
};

/**
 * ユーザーのセッションを無効化
 */
export const invalidateUserSessions = async (
  client: KeycloakAdminClient,
  params: {
    userId: string;
  },
): Promise<void> => {
  await client.invalidateUserSessions(params.userId);
};

// ================================
// 以下は互換性のために残す古い関数
// 将来的に削除予定
// ================================

/**
 * @deprecated ロールサブグループ方式に移行済み。互換性のために残している。
 * ユーザーにRealm Roleを直接割り当て
 */
export const assignRole = async (
  client: KeycloakAdminClient,
  userId: string,
  roleName: OrganizationRole,
): Promise<void> => {
  const role = await client.getRealmRole(roleName);
  await client.assignRealmRole(userId, role);
};
