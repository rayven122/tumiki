import { PermissionAction, ResourceType } from "@tumiki/db";

// 権限定数の定義
export const PERMISSIONS = {
  ACTIONS: PermissionAction,
  RESOURCES: ResourceType,
} as const;

// 権限定義のタイプ
export type Permission = {
  resourceType: ResourceType;
  action: PermissionAction;
};

// 権限セットのタイプ
export type PermissionSet = Permission[];

// 事前定義された権限セット
export const PERMISSION_SETS = {
  // 管理者権限 - 全てのリソースに対する全ての権限
  ADMIN: [
    // グループ管理
    { resourceType: ResourceType.GROUP, action: PermissionAction.CREATE },
    { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.GROUP, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.GROUP, action: PermissionAction.DELETE },
    { resourceType: ResourceType.GROUP, action: PermissionAction.MANAGE },
    
    // メンバー管理
    { resourceType: ResourceType.MEMBER, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.DELETE },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.MANAGE },
    
    // ロール管理
    { resourceType: ResourceType.ROLE, action: PermissionAction.CREATE },
    { resourceType: ResourceType.ROLE, action: PermissionAction.READ },
    { resourceType: ResourceType.ROLE, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.ROLE, action: PermissionAction.DELETE },
    { resourceType: ResourceType.ROLE, action: PermissionAction.MANAGE },
    
    // MCPサーバー設定管理
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.DELETE },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.MANAGE },
    
    // ツールグループ管理
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.CREATE },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.DELETE },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.MANAGE },
    
    // MCPサーバーインスタンス管理
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.DELETE },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.MANAGE },
  ] as PermissionSet,

  // 読み取り専用権限
  READ_ONLY: [
    { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
    { resourceType: ResourceType.ROLE, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.READ },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.READ },
  ] as PermissionSet,

  // エディター権限 - CRUD操作は可能だが管理権限はなし
  EDITOR: [
    { resourceType: ResourceType.GROUP, action: PermissionAction.CREATE },
    { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.GROUP, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.GROUP, action: PermissionAction.DELETE },
    
    { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.UPDATE },
    
    { resourceType: ResourceType.ROLE, action: PermissionAction.READ },
    
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.DELETE },
    
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.CREATE },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.DELETE },
    
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.DELETE },
  ] as PermissionSet,

  // 開発者権限 - MCPサーバー関連の操作のみ
  DEVELOPER: [
    { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
    { resourceType: ResourceType.ROLE, action: PermissionAction.READ },
    
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.MCP_SERVER_CONFIG, action: PermissionAction.DELETE },
    
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.CREATE },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.TOOL_GROUP, action: PermissionAction.DELETE },
    
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.READ },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.UPDATE },
    { resourceType: ResourceType.MCP_SERVER_INSTANCE, action: PermissionAction.DELETE },
  ] as PermissionSet,
} as const;

// 権限チェック用のユーティリティ関数
export const hasPermission = (
  userPermissions: Permission[],
  requiredResourceType: ResourceType,
  requiredAction: PermissionAction
): boolean => {
  return userPermissions.some(
    (permission) =>
      permission.resourceType === requiredResourceType &&
      permission.action === requiredAction
  );
};

// 複数の権限をチェック（全て満たす必要がある）
export const hasAllPermissions = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.every((required) =>
    hasPermission(userPermissions, required.resourceType, required.action)
  );
};

// 複数の権限をチェック（いずれかを満たせばよい）
export const hasAnyPermission = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.some((required) =>
    hasPermission(userPermissions, required.resourceType, required.action)
  );
};

// 権限セットから特定のリソースタイプの権限を取得
export const getPermissionsForResource = (
  permissions: Permission[],
  resourceType: ResourceType
): PermissionAction[] => {
  return permissions
    .filter((permission) => permission.resourceType === resourceType)
    .map((permission) => permission.action);
};

// 権限の表示名を取得
export const getPermissionDisplayName = (
  resourceType: ResourceType,
  action: PermissionAction
): string => {
  const resourceNames = {
    [ResourceType.GROUP]: "グループ",
    [ResourceType.MEMBER]: "メンバー",
    [ResourceType.ROLE]: "ロール",
    [ResourceType.MCP_SERVER_CONFIG]: "MCPサーバー設定",
    [ResourceType.TOOL_GROUP]: "ツールグループ",
    [ResourceType.MCP_SERVER_INSTANCE]: "MCPサーバーインスタンス",
  };

  const actionNames = {
    [PermissionAction.CREATE]: "作成",
    [PermissionAction.READ]: "読み取り",
    [PermissionAction.UPDATE]: "編集",
    [PermissionAction.DELETE]: "削除",
    [PermissionAction.MANAGE]: "管理",
  };

  return `${resourceNames[resourceType]}の${actionNames[action]}`;
};

// リソースタイプの表示名を取得
export const getResourceTypeDisplayName = (resourceType: ResourceType): string => {
  const resourceNames = {
    [ResourceType.GROUP]: "グループ",
    [ResourceType.MEMBER]: "メンバー",
    [ResourceType.ROLE]: "ロール",
    [ResourceType.MCP_SERVER_CONFIG]: "MCPサーバー設定",
    [ResourceType.TOOL_GROUP]: "ツールグループ",
    [ResourceType.MCP_SERVER_INSTANCE]: "MCPサーバーインスタンス",
  };

  return resourceNames[resourceType];
};

// アクションの表示名を取得
export const getActionDisplayName = (action: PermissionAction): string => {
  const actionNames = {
    [PermissionAction.CREATE]: "作成",
    [PermissionAction.READ]: "読み取り",
    [PermissionAction.UPDATE]: "編集",
    [PermissionAction.DELETE]: "削除",
    [PermissionAction.MANAGE]: "管理",
  };

  return actionNames[action];
};

// 権限セットを比較して変更を検出
export const getPermissionChanges = (
  oldPermissions: Permission[],
  newPermissions: Permission[]
): {
  added: Permission[];
  removed: Permission[];
} => {
  const oldSet = new Set(
    oldPermissions.map((p) => `${p.resourceType}:${p.action}`)
  );
  const newSet = new Set(
    newPermissions.map((p) => `${p.resourceType}:${p.action}`)
  );

  const added = newPermissions.filter(
    (p) => !oldSet.has(`${p.resourceType}:${p.action}`)
  );
  const removed = oldPermissions.filter(
    (p) => !newSet.has(`${p.resourceType}:${p.action}`)
  );

  return { added, removed };
};

// 権限セットをグループ化してリソースタイプ別に整理
export const groupPermissionsByResource = (
  permissions: Permission[]
): Record<ResourceType, PermissionAction[]> => {
  const grouped = {} as Record<ResourceType, PermissionAction[]>;

  for (const resourceType of Object.values(ResourceType)) {
    grouped[resourceType] = getPermissionsForResource(permissions, resourceType);
  }

  return grouped;
};