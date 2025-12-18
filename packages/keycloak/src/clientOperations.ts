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

/**
 * グループロールを作成
 * 実際にはRealm Roleとして作成し、グループにマッピングする
 * ロール名には組織IDをプレフィックスとして使用（例: "org_abc123_engineering_manager"）
 */
export const createGroupRole = async (
  client: KcAdminClient,
  groupId: string,
  params: {
    name: string;
    description?: string;
    attributes?: Record<string, string[]>;
  },
): Promise<{ success: boolean; roleId?: string; error?: string }> => {
  try {
    // ロール名のバリデーション：アンダースコアを含む場合は拒否
    if (params.name.includes("_")) {
      return {
        success: false,
        error: "ロール名にアンダースコア(_)を含めることはできません",
      };
    }

    // 1. Realm Roleを作成（ロール名にグループIDをプレフィックス）
    const roleNameWithPrefix = `group_${groupId}_${params.name}`;

    // 重複チェック：既に同じ名前のロールが存在する場合はエラー
    const existingRole = await client.roles.findOneByName({
      name: roleNameWithPrefix,
    });
    if (existingRole) {
      return {
        success: false,
        error: `ロール "${params.name}" は既に存在します`,
      };
    }

    const response = await client.roles.create({
      name: roleNameWithPrefix,
      description: params.description,
      attributes: {
        ...params.attributes,
        groupId: [groupId], // グループIDを属性に保存
        originalName: [params.name], // 元のロール名を保存
      },
    });

    const roleId = response.roleName;

    if (!roleId) {
      return {
        success: false,
        error: "Failed to extract role ID from response",
      };
    }

    return { success: true, roleId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * グループロール一覧を取得
 * グループにマッピングされたRealm Rolesのうち、
 * グループIDをプレフィックスに持つロールを返す
 */
export const listGroupRoles = async (
  client: KcAdminClient,
  groupId: string,
): Promise<{
  success: boolean;
  roles?: RoleRepresentation[];
  error?: string;
}> => {
  try {
    // グループにマッピングされたRealm Rolesを取得
    const allRoles = await client.groups.listRealmRoleMappings({ id: groupId });

    // グループIDをプレフィックスに持つロールのみをフィルタ
    const groupRoles = allRoles.filter(
      (role) => role.name && role.name.startsWith(`group_${groupId}_`),
    );

    // ロール名からプレフィックスを除去して返す
    const rolesWithOriginalNames = groupRoles.map((role) => ({
      ...role,
      name: role.attributes?.originalName?.[0] || role.name,
    }));

    return { success: true, roles: rolesWithOriginalNames };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * グループロールを削除
 * 実際にはRealm Roleを削除する
 */
export const deleteGroupRole = async (
  client: KcAdminClient,
  groupId: string,
  roleName: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // プレフィックス付きのロール名を作成
    const roleNameWithPrefix = `group_${groupId}_${roleName}`;

    // Realm Roleを削除
    await client.roles.delByName({ name: roleNameWithPrefix });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * ユーザーにグループロールを割り当て
 * 実際にはユーザーにRealm Roleを割り当てる
 */
export const assignGroupRoleToUser = async (
  client: KcAdminClient,
  groupId: string,
  userId: string,
  roleName: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // プレフィックス付きのロール名を作成
    const roleNameWithPrefix = `group_${groupId}_${roleName}`;

    // Realm Roleを取得
    const role = await client.roles.findOneByName({ name: roleNameWithPrefix });

    if (!role?.id || !role.name) {
      return {
        success: false,
        error: `Role not found: ${roleName}`,
      };
    }

    // ユーザーにRealm Roleを割り当て
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
 * ユーザーからグループロールを削除
 * 実際にはユーザーからRealm Roleを削除する
 */
export const removeGroupRoleFromUser = async (
  client: KcAdminClient,
  groupId: string,
  userId: string,
  roleName: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // プレフィックス付きのロール名を作成
    const roleNameWithPrefix = `group_${groupId}_${roleName}`;

    // Realm Roleを取得
    const role = await client.roles.findOneByName({ name: roleNameWithPrefix });

    if (!role?.id || !role.name) {
      return {
        success: false,
        error: `Role not found: ${roleName}`,
      };
    }

    // ユーザーからRealm Roleを削除
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
