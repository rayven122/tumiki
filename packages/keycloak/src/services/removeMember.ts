import type { KeycloakAdminClient } from "../client.js";

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
