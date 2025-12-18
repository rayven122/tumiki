import type KcAdminClient from "@keycloak/keycloak-admin-client";

/**
 * グループを作成（フラット構造）
 */
export const createGroup = async (
  client: KcAdminClient,
  params: {
    name: string;
    attributes?: Record<string, string[]>;
  },
): Promise<{ success: boolean; groupId?: string; error?: string }> => {
  try {
    const response = await client.groups.create({
      name: params.name,
      attributes: params.attributes ?? {},
    });

    // レスポンスのidがgroupIdとして返される
    const groupId = response.id;

    if (!groupId) {
      return {
        success: false,
        error: "Failed to extract group ID from response",
      };
    }

    return { success: true, groupId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
