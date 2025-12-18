import type KcAdminClient from "@keycloak/keycloak-admin-client";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";

import type { OrganizationRole } from "../types.js";

/**
 * Realm Roleを取得
 */
export const getRealmRole = async (
  client: KcAdminClient,
  roleName: OrganizationRole,
): Promise<{
  success: boolean;
  role?: RoleRepresentation;
  error?: string;
}> => {
  try {
    const role = await client.roles.findOneByName({ name: roleName });

    if (!role) {
      return {
        success: false,
        error: `Role not found: ${roleName}`,
      };
    }

    return { success: true, role };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
