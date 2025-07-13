import { PermissionAction, ResourceType } from "@tumiki/db";

export const PERMISSION_ACTIONS = {
  CREATE: PermissionAction.CREATE,
  READ: PermissionAction.READ,
  UPDATE: PermissionAction.UPDATE,
  DELETE: PermissionAction.DELETE,
  MANAGE: PermissionAction.MANAGE,
} as const;

export const RESOURCE_TYPES = {
  GROUP: ResourceType.GROUP,
  MEMBER: ResourceType.MEMBER,
  ROLE: ResourceType.ROLE,
  MCP_SERVER_CONFIG: ResourceType.MCP_SERVER_CONFIG,
  TOOL_GROUP: ResourceType.TOOL_GROUP,
  MCP_SERVER_INSTANCE: ResourceType.MCP_SERVER_INSTANCE,
} as const;

export const PERMISSION_LABELS = {
  [PermissionAction.CREATE]: "作成",
  [PermissionAction.READ]: "読み取り",
  [PermissionAction.UPDATE]: "編集",
  [PermissionAction.DELETE]: "削除",
  [PermissionAction.MANAGE]: "管理",
} as const;

export const RESOURCE_TYPE_LABELS = {
  [ResourceType.GROUP]: "グループ",
  [ResourceType.MEMBER]: "メンバー",
  [ResourceType.ROLE]: "ロール",
  [ResourceType.MCP_SERVER_CONFIG]: "MCPサーバー設定",
  [ResourceType.TOOL_GROUP]: "ツールグループ",
  [ResourceType.MCP_SERVER_INSTANCE]: "MCPサーバーインスタンス",
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
    action: PermissionAction.MANAGE,
  });
};

export const getPermissionMatrix = (): Record<
  ResourceType,
  PermissionAction[]
> => {
  return {
    [ResourceType.GROUP]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE,
    ],
    [ResourceType.MEMBER]: [
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE,
    ],
    [ResourceType.ROLE]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE,
    ],
    [ResourceType.MCP_SERVER_CONFIG]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE,
    ],
    [ResourceType.TOOL_GROUP]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE,
    ],
    [ResourceType.MCP_SERVER_INSTANCE]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE,
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
