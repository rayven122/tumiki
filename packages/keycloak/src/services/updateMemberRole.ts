import type { KeycloakAdminClient } from "../client.js";
import type { OrganizationRole } from "../types.js";
import { assignRole } from "./assignRole.js";

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
