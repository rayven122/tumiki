import type KcAdminClient from "@keycloak/keycloak-admin-client";
import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";

/**
 * グループ情報を取得
 */
export const getGroup = async (
  client: KcAdminClient,
  groupId: string,
): Promise<{
  success: boolean;
  group?: GroupRepresentation;
  error?: string;
}> => {
  try {
    const group = await client.groups.findOne({ id: groupId });

    if (!group) {
      return {
        success: false,
        error: `Group not found: ${groupId}`,
      };
    }

    return { success: true, group };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
