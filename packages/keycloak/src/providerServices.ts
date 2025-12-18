import type { KeycloakAdminClient } from "./client.js";
import type { OrganizationRole } from "./types.js";

/**
 * ユーザーにロールを割り当て
 */
export const assignRole = async (
  client: KeycloakAdminClient,
  userId: string,
  roleName: OrganizationRole,
): Promise<{ success: boolean; error?: string }> => {
  // Realm Roleを取得
  const roleResult = await client.getRealmRole(roleName);

  if (!roleResult.success || !roleResult.role) {
    return {
      success: false,
      error: roleResult.error ?? `Failed to get realm role: ${roleName}`,
    };
  }

  // ロールを割り当て
  const assignResult = await client.assignRealmRole(userId, roleResult.role);

  if (!assignResult.success) {
    return {
      success: false,
      error: assignResult.error ?? "Failed to assign realm role",
    };
  }

  return { success: true };
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
): Promise<{ success: boolean; error?: string }> => {
  // 1. ユーザーをグループに追加
  const addToGroupResult = await client.addUserToGroup(
    params.userId,
    params.externalId,
  );

  if (!addToGroupResult.success) {
    return {
      success: false,
      error: addToGroupResult.error ?? "Failed to add user to group",
    };
  }

  // 2. ロールを割り当て
  const assignRoleResult = await assignRole(client, params.userId, params.role);

  if (!assignRoleResult.success) {
    // ロール割り当てに失敗した場合、グループから削除してロールバック
    await client.removeUserFromGroup(params.userId, params.externalId);
    return {
      success: false,
      error: assignRoleResult.error ?? "Failed to assign role to user",
    };
  }

  return { success: true };
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
  }) => Promise<{ success: boolean; error?: string }>,
): Promise<{ success: boolean; externalId: string; error?: string }> => {
  // 1. Keycloakにグループを作成
  const createResult = await client.createGroup({
    name: params.groupName,
    attributes: {
      displayName: [params.name],
    },
  });

  if (!createResult.success || !createResult.groupId) {
    return {
      success: false,
      externalId: "",
      error: createResult.error ?? "Failed to create group",
    };
  }

  const groupId = createResult.groupId;

  // 2. デフォルトロールをGroup Rolesとして作成（オプション）
  if (params.createDefaultRoles !== false) {
    const defaultRoles: Array<{ name: OrganizationRole; description: string }> =
      [
        { name: "Owner", description: "組織オーナー - 全権限" },
        { name: "Admin", description: "組織管理者 - メンバー管理可能" },
        { name: "Member", description: "組織メンバー - 基本利用" },
        { name: "Viewer", description: "組織閲覧者 - 読み取り専用" },
      ];

    for (const role of defaultRoles) {
      const roleResult = await client.createGroupRole(groupId, {
        name: role.name,
        description: role.description,
      });

      if (!roleResult.success) {
        // グループロール作成に失敗した場合はロールバック
        await client.deleteGroup(groupId);
        return {
          success: false,
          externalId: "",
          error:
            roleResult.error ?? `Failed to create group role: ${role.name}`,
        };
      }
    }
  }

  // 3. OwnerをグループメンバーとしてOwnerロールで追加
  const addMemberResult = await addMemberFn({
    externalId: groupId,
    userId: params.ownerId,
    role: "Owner",
  });

  if (!addMemberResult.success) {
    // グループ作成は成功したが、メンバー追加に失敗した場合はロールバック
    await client.deleteGroup(groupId);
    return {
      success: false,
      externalId: "",
      error: addMemberResult.error ?? "Failed to add owner to group",
    };
  }

  return {
    success: true,
    externalId: groupId,
  };
};

/**
 * 組織グループを削除
 */
export const deleteOrganization = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
  },
): Promise<{ success: boolean; error?: string }> => {
  const result = await client.deleteGroup(params.externalId);

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Failed to delete organization group",
    };
  }

  return { success: true };
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
): Promise<{ success: boolean; error?: string }> => {
  // 1. ユーザーのロールを全て削除
  const rolesResult = await client.getUserRealmRoles(params.userId);

  if (rolesResult.success && rolesResult.roles) {
    // 組織ロールのみを削除（Owner/Admin/Member/Viewer）
    const orgRoles = rolesResult.roles.filter(
      (role) =>
        role.name && ["Owner", "Admin", "Member", "Viewer"].includes(role.name),
    );

    for (const role of orgRoles) {
      await client.removeRealmRole(params.userId, role);
    }
  }

  // 2. ユーザーをグループから削除
  const removeResult = await client.removeUserFromGroup(
    params.userId,
    params.externalId,
  );

  if (!removeResult.success) {
    return {
      success: false,
      error: removeResult.error ?? "Failed to remove user from group",
    };
  }

  // 3. セッションを無効化（即時反映）
  await client.invalidateUserSessions(params.userId);

  return { success: true };
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
): Promise<{ success: boolean; error?: string }> => {
  // 1. 既存のロールを全て削除
  const rolesResult = await client.getUserRealmRoles(params.userId);

  if (rolesResult.success && rolesResult.roles) {
    // 組織ロールのみを削除（Owner/Admin/Member/Viewer）
    const orgRoles = rolesResult.roles.filter(
      (role) =>
        role.name && ["Owner", "Admin", "Member", "Viewer"].includes(role.name),
    );

    for (const role of orgRoles) {
      const removeResult = await client.removeRealmRole(params.userId, role);
      if (!removeResult.success) {
        return {
          success: false,
          error: removeResult.error ?? `Failed to remove role: ${role.name}`,
        };
      }
    }
  }

  // 2. 新しいロールを割り当て
  const assignResult = await assignRole(client, params.userId, params.newRole);

  if (!assignResult.success) {
    return {
      success: false,
      error: assignResult.error ?? "Failed to assign new role",
    };
  }

  // 3. セッションを無効化（即時反映）
  const invalidateResult = await client.invalidateUserSessions(params.userId);

  if (!invalidateResult.success) {
    return {
      success: false,
      error: invalidateResult.error ?? "Failed to invalidate user sessions",
    };
  }

  return { success: true };
};

/**
 * ユーザーのセッションを無効化
 */
export const invalidateUserSessions = async (
  client: KeycloakAdminClient,
  params: {
    userId: string;
  },
): Promise<{ success: boolean; error?: string }> => {
  const result = await client.invalidateUserSessions(params.userId);

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Failed to invalidate user sessions",
    };
  }

  return { success: true };
};
