import type { KeycloakAdminClient } from "../client.js";
import type { OrganizationRole } from "../types.js";
import { assignRole } from "./assignRole.js";

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
