import type { KeycloakAdminClient } from "../client.js";

/**
 * 組織グループを削除
 */
export const deleteOrganization = async (
  client: KeycloakAdminClient,
  params: {
    externalId: string;
  },
): Promise<{ success: boolean; error?: string }> => {
  const result = await client.deleteGroup(params.externalId);

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Failed to delete organization group",
    };
  }

  return { success: true };
};
