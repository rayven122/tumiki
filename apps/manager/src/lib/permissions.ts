// クライアントサイド用の型と定数定義
export const PERMISSION_ACTIONS = {
  CREATE: "CREATE",
  READ: "READ", 
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  MANAGE: "MANAGE",
} as const;

export const RESOURCE_TYPES = {
  GROUP: "GROUP",
  MEMBER: "MEMBER",
  ROLE: "ROLE",
  MCP_SERVER_CONFIG: "MCP_SERVER_CONFIG",
  TOOL_GROUP: "TOOL_GROUP",
  MCP_SERVER_INSTANCE: "MCP_SERVER_INSTANCE",
} as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];
export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

export const PERMISSION_LABELS = {
  [PERMISSION_ACTIONS.CREATE]: "作成",
  [PERMISSION_ACTIONS.READ]: "読み取り",
  [PERMISSION_ACTIONS.UPDATE]: "編集", 
  [PERMISSION_ACTIONS.DELETE]: "削除",
  [PERMISSION_ACTIONS.MANAGE]: "管理",
} as const;

export const RESOURCE_TYPE_LABELS = {
  [RESOURCE_TYPES.GROUP]: "グループ",
  [RESOURCE_TYPES.MEMBER]: "メンバー",
  [RESOURCE_TYPES.ROLE]: "ロール",
  [RESOURCE_TYPES.MCP_SERVER_CONFIG]: "MCPサーバー設定",
  [RESOURCE_TYPES.TOOL_GROUP]: "ツールグループ",
  [RESOURCE_TYPES.MCP_SERVER_INSTANCE]: "MCPサーバーインスタンス",
} as const;

export type Permission = {
  resourceType: ResourceType;
  action: PermissionAction;
};

export type RoleWithPermissions = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  permissions: Permission[];
  _count: {
    members: number;
    groups: number;
  };
};

export const checkPermission = (
  userPermissions: Permission[],
  requiredPermission: Permission,
): boolean => {
  return userPermissions.some(
    (permission) =>
      permission.resourceType === requiredPermission.resourceType &&
      permission.action === requiredPermission.action,
  );
};

export const hasManagePermission = (
  userPermissions: Permission[],
  resourceType: ResourceType,
): boolean => {
  return checkPermission(userPermissions, {
    resourceType,
    action: PERMISSION_ACTIONS.MANAGE,
  });
};

export const getPermissionMatrix = (): Record<
  ResourceType,
  PermissionAction[]
> => {
  return {
    [RESOURCE_TYPES.GROUP]: [
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.READ,
      PERMISSION_ACTIONS.UPDATE,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.MANAGE,
    ],
    [RESOURCE_TYPES.MEMBER]: [
      PERMISSION_ACTIONS.READ,
      PERMISSION_ACTIONS.UPDATE,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.MANAGE,
    ],
    [RESOURCE_TYPES.ROLE]: [
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.READ,
      PERMISSION_ACTIONS.UPDATE,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.MANAGE,
    ],
    [RESOURCE_TYPES.MCP_SERVER_CONFIG]: [
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.READ,
      PERMISSION_ACTIONS.UPDATE,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.MANAGE,
    ],
    [RESOURCE_TYPES.TOOL_GROUP]: [
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.READ,
      PERMISSION_ACTIONS.UPDATE,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.MANAGE,
    ],
    [RESOURCE_TYPES.MCP_SERVER_INSTANCE]: [
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.READ,
      PERMISSION_ACTIONS.UPDATE,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.MANAGE,
    ],
  };
};

export const getAllPermissions = (): Permission[] => {
  const matrix = getPermissionMatrix();
  const permissions: Permission[] = [];

  Object.entries(matrix).forEach(([resourceType, actions]) => {
    actions.forEach((action) => {
      permissions.push({
        resourceType: resourceType as ResourceType,
        action,
      });
    });
  });

  return permissions;
};
