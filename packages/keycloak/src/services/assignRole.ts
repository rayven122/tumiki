import type { KeycloakAdminClient } from "../client.js";
import type { OrganizationRole } from "../types.js";

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
