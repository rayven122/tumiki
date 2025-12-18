import type KcAdminClient from "@keycloak/keycloak-admin-client";
import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import type { RoleMappingPayload } from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";

import type { OrganizationRole } from "./types.js";

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

/**
 * ユーザーにRealm Roleを割り当て
 */
export const assignRealmRole = async (
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

    await client.users.addRealmRoleMappings({
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
