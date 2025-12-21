import type { KeycloakAdminClient } from "./client.js";
import type { OrganizationRole } from "./types.js";

/**
 * ユーザーにロールを割り当て
 */
export const assignRole = async (
  client: KeycloakAdminClient,
  userId: string,
  roleName: OrganizationRole,
): Promise<void> => {
  // Realm Roleを取得
  const role = await client.getRealmRole(roleName);

  // ロールを割り当て
  await client.assignRealmRole(userId, role);
};

/**
 * ユーザーを組織に追加
 */
export const addMember = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  },
): Promise<void> => {
  // 1. ユーザーをグループに追加
  await client.addUserToGroup(params.userId, params.externalId);

  // 2. ロールを割り当て（失敗時はグループから削除してロールバック）
  try {
    await assignRole(client, params.userId, params.role);
  } catch (error) {
    await client.removeUserFromGroup(params.userId, params.externalId);
    throw error;
  }
};

/**
 * 組織グループを作成
 */
export const createOrganization = async (
  client: KeycloakAdminClient,
  params: {
    name: string;
    groupName: string;
    ownerId: string;
    createDefaultRoles?: boolean; // デフォルト: true
  },
  addMemberFn: (params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  }) => Promise<void>,
): Promise<string> => {
  // 1. Keycloakにグループを作成
  const groupId = await client.createGroup({
    name: params.groupName,
    attributes: {
      displayName: [params.name],
    },
  });

  // 2. デフォルトロールをGroup Rolesとして作成（オプション）
  if (params.createDefaultRoles !== false) {
    const defaultRoles: Array<{
      name: OrganizationRole;
      description: string;
    }> = [
      { name: "Owner", description: "組織オーナー - 全権限" },
      { name: "Admin", description: "組織管理者 - メンバー管理可能" },
      { name: "Member", description: "組織メンバー - 基本利用" },
      { name: "Viewer", description: "組織閲覧者 - 読み取り専用" },
    ];

    const createdRoles: string[] = [];

    try {
      for (const role of defaultRoles) {
        await client.createGroupRole(groupId, {
          name: role.name,
          description: role.description,
        });
        createdRoles.push(role.name);
      }
    } catch (error) {
      // グループロール作成に失敗 → 作成済みロールとグループを削除
      for (const createdRoleName of createdRoles) {
        await client.deleteGroupRole(groupId, createdRoleName);
      }
      await client.deleteGroup(groupId);
      throw error;
    }
  }

  // 3. OwnerをグループメンバーとしてOwnerロールで追加
  try {
    await addMemberFn({
      externalId: groupId,
      userId: params.ownerId,
      role: "Owner",
    });
  } catch (error) {
    // メンバー追加に失敗 → 作成したロールとグループを削除
    if (params.createDefaultRoles !== false) {
      const defaultRoleNames: OrganizationRole[] = [
        "Owner",
        "Admin",
        "Member",
        "Viewer",
      ];
      for (const roleName of defaultRoleNames) {
        await client.deleteGroupRole(groupId, roleName);
      }
    }
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
 * ユーザーを組織から削除
 */
export const removeMember = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
    userId: string;
  },
): Promise<void> => {
  // 1. ユーザーのロールを全て削除
  const roles = await client.getUserRealmRoles(params.userId);

  // 組織ロールのみを削除（Owner/Admin/Member/Viewer）
  const orgRoles = roles.filter(
    (role) =>
      role.name && ["Owner", "Admin", "Member", "Viewer"].includes(role.name),
  );

  for (const role of orgRoles) {
    await client.removeRealmRole(params.userId, role);
  }

  // 2. ユーザーをグループから削除
  await client.removeUserFromGroup(params.userId, params.externalId);

  // 3. セッションを無効化（即時反映）
  await client.invalidateUserSessions(params.userId);
};

/**
 * ユーザーのロールを更新
 */
export const updateMemberRole = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
    userId: string;
    newRole: OrganizationRole;
  },
): Promise<void> => {
  // 1. 既存のロールを全て削除
  const roles = await client.getUserRealmRoles(params.userId);

  // 組織ロールのみを削除（Owner/Admin/Member/Viewer）
  const orgRoles = roles.filter(
    (role) =>
      role.name && ["Owner", "Admin", "Member", "Viewer"].includes(role.name),
  );

  for (const role of orgRoles) {
    await client.removeRealmRole(params.userId, role);
  }

  // 2. 新しいロールを割り当て
  await assignRole(client, params.userId, params.newRole);

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
