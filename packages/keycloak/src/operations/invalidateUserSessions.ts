import type KcAdminClient from "@keycloak/keycloak-admin-client";

/**
 * ユーザーの全セッションを無効化
 */
export const invalidateUserSessions = async (
  client: KcAdminClient,
  userId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await client.users.logout({ id: userId });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
