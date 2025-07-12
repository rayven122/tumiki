import type { PermissionAction, ResourceType } from "@tumiki/db";

// 権限アクション定数
export const PERMISSION_ACTIONS: Record<string, PermissionAction> = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE", 
  DELETE: "DELETE",
  MANAGE: "MANAGE",
} as const;

// リソースタイプ定数
export const RESOURCE_TYPES: Record<string, ResourceType> = {
  GROUP: "GROUP",
  MEMBER: "MEMBER",
  ROLE: "ROLE",
  MCP_SERVER_CONFIG: "MCP_SERVER_CONFIG",
  TOOL_GROUP: "TOOL_GROUP",
  MCP_SERVER_INSTANCE: "MCP_SERVER_INSTANCE",
} as const;

// 権限の組み合わせ型
export type Permission = {
  resourceType: ResourceType;
  action: PermissionAction;
};

// よく使用される権限セット
export const PERMISSION_SETS = {
  // 管理者権限（全権限）
  ADMIN: Object.values(RESOURCE_TYPES).flatMap(resourceType =>
    Object.values(PERMISSION_ACTIONS).map(action => ({
      resourceType,
      action,
    }))
  ),

  // 読み取り専用権限
  READ_ONLY: Object.values(RESOURCE_TYPES).map(resourceType => ({
    resourceType,
    action: PERMISSION_ACTIONS.READ,
  })),

  // エディター権限（作成・読み取り・更新）
  EDITOR: Object.values(RESOURCE_TYPES).flatMap(resourceType => [
    { resourceType, action: PERMISSION_ACTIONS.CREATE },
    { resourceType, action: PERMISSION_ACTIONS.READ },
    { resourceType, action: PERMISSION_ACTIONS.UPDATE },
  ]),

  // メンバー管理権限
  MEMBER_MANAGER: [
    { resourceType: RESOURCE_TYPES.MEMBER, action: PERMISSION_ACTIONS.CREATE },
    { resourceType: RESOURCE_TYPES.MEMBER, action: PERMISSION_ACTIONS.READ },
    { resourceType: RESOURCE_TYPES.MEMBER, action: PERMISSION_ACTIONS.UPDATE },
    { resourceType: RESOURCE_TYPES.MEMBER, action: PERMISSION_ACTIONS.DELETE },
    { resourceType: RESOURCE_TYPES.GROUP, action: PERMISSION_ACTIONS.READ },
    { resourceType: RESOURCE_TYPES.ROLE, action: PERMISSION_ACTIONS.READ },
  ],

  // MCP管理権限
  MCP_MANAGER: [
    { resourceType: RESOURCE_TYPES.MCP_SERVER_CONFIG, action: PERMISSION_ACTIONS.CREATE },
    { resourceType: RESOURCE_TYPES.MCP_SERVER_CONFIG, action: PERMISSION_ACTIONS.READ },
    { resourceType: RESOURCE_TYPES.MCP_SERVER_CONFIG, action: PERMISSION_ACTIONS.UPDATE },
    { resourceType: RESOURCE_TYPES.MCP_SERVER_CONFIG, action: PERMISSION_ACTIONS.DELETE },
    { resourceType: RESOURCE_TYPES.MCP_SERVER_INSTANCE, action: PERMISSION_ACTIONS.CREATE },
    { resourceType: RESOURCE_TYPES.MCP_SERVER_INSTANCE, action: PERMISSION_ACTIONS.READ },
    { resourceType: RESOURCE_TYPES.MCP_SERVER_INSTANCE, action: PERMISSION_ACTIONS.UPDATE },
    { resourceType: RESOURCE_TYPES.MCP_SERVER_INSTANCE, action: PERMISSION_ACTIONS.DELETE },
    { resourceType: RESOURCE_TYPES.TOOL_GROUP, action: PERMISSION_ACTIONS.CREATE },
    { resourceType: RESOURCE_TYPES.TOOL_GROUP, action: PERMISSION_ACTIONS.READ },
    { resourceType: RESOURCE_TYPES.TOOL_GROUP, action: PERMISSION_ACTIONS.UPDATE },
    { resourceType: RESOURCE_TYPES.TOOL_GROUP, action: PERMISSION_ACTIONS.DELETE },
  ],
} as const;

/**
 * 権限を比較する関数
 */
export const comparePermissions = (a: Permission, b: Permission): number => {
  if (a.resourceType !== b.resourceType) {
    return a.resourceType.localeCompare(b.resourceType);
  }
  return a.action.localeCompare(b.action);
};

/**
 * 権限リストを正規化する（重複削除・ソート）
 */
export const normalizePermissions = (permissions: Permission[]): Permission[] => {
  const unique = permissions.filter((permission, index, self) =>
    index === self.findIndex(p => 
      p.resourceType === permission.resourceType && p.action === permission.action
    )
  );
  return unique.sort(comparePermissions);
};

/**
 * 権限が包含されているかチェック
 */
export const hasPermission = (
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean => {
  return userPermissions.some(permission =>
    permission.resourceType === requiredPermission.resourceType &&
    permission.action === requiredPermission.action
  );
};

/**
 * 複数の権限がすべて包含されているかチェック
 */
export const hasAllPermissions = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.every(required =>
    hasPermission(userPermissions, required)
  );
};

/**
 * 権限の日本語表示名を取得
 */
export const getPermissionDisplayName = (permission: Permission): string => {
  const resourceNames: Record<ResourceType, string> = {
    GROUP: "グループ",
    MEMBER: "メンバー",
    ROLE: "ロール",
    MCP_SERVER_CONFIG: "MCPサーバー設定",
    TOOL_GROUP: "ツールグループ",
    MCP_SERVER_INSTANCE: "MCPサーバーインスタンス",
  };

  const actionNames: Record<PermissionAction, string> = {
    CREATE: "作成",
    READ: "読み取り",
    UPDATE: "編集",
    DELETE: "削除",
    MANAGE: "管理",
  };

  return `${resourceNames[permission.resourceType]}${actionNames[permission.action]}`;
};

/**
 * リソースタイプの日本語表示名を取得
 */
export const getResourceTypeDisplayName = (resourceType: ResourceType): string => {
  const names: Record<ResourceType, string> = {
    GROUP: "グループ",
    MEMBER: "メンバー",
    ROLE: "ロール",
    MCP_SERVER_CONFIG: "MCPサーバー設定",
    TOOL_GROUP: "ツールグループ",
    MCP_SERVER_INSTANCE: "MCPサーバーインスタンス",
  };
  return names[resourceType];
};

/**
 * 権限アクションの日本語表示名を取得
 */
export const getPermissionActionDisplayName = (action: PermissionAction): string => {
  const names: Record<PermissionAction, string> = {
    CREATE: "作成",
    READ: "読み取り",
    UPDATE: "編集",
    DELETE: "削除",
    MANAGE: "管理",
  };
  return names[action];
};