import type KcAdminClient from "@keycloak/keycloak-admin-client";

/**
 * グループを削除
 */
export const deleteGroup = async (
  client: KcAdminClient,
  groupId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await client.groups.del({ id: groupId });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
