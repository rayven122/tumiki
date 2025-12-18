import type KcAdminClient from "@keycloak/keycloak-admin-client";

/**
 * ユーザーをグループから削除
 */
export const removeUserFromGroup = async (
  client: KcAdminClient,
  userId: string,
  groupId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await client.users.delFromGroup({
      id: userId,
      groupId,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
