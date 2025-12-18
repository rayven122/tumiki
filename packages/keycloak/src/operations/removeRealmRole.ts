import type KcAdminClient from "@keycloak/keycloak-admin-client";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import type { RoleMappingPayload } from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";

/**
 * ユーザーからRealm Roleを削除
 */
export const removeRealmRole = async (
  client: KcAdminClient,
  userId: string,
  role: RoleRepresentation,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // RoleRepresentationをRoleMappingPayloadに変換
    if (!role.id || !role.name) {
      return {
        success: false,
        error: "Role must have id and name",
      };
    }

    await client.users.delRealmRoleMappings({
      id: userId,
      roles: [role as RoleMappingPayload],
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
