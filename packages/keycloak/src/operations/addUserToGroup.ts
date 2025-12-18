import type KcAdminClient from "@keycloak/keycloak-admin-client";

/**
 * ユーザーをグループに追加
 */
export const addUserToGroup = async (
  client: KcAdminClient,
  userId: string,
  groupId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await client.users.addToGroup({
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
