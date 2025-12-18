import type KcAdminClient from "@keycloak/keycloak-admin-client";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";

/**
 * ユーザーの現在のRealm Rolesを取得
 */
export const getUserRealmRoles = async (
  client: KcAdminClient,
  userId: string,
): Promise<{
  success: boolean;
  roles?: RoleRepresentation[];
  error?: string;
}> => {
  try {
    const roles = await client.users.listRealmRoleMappings({
      id: userId,
    });
    return { success: true, roles };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
