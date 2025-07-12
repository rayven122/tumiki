import { type PermissionAction, type ResourceType } from "@tumiki/db";

/**
 * リソースタイプごとの利用可能なアクション定義
 */
export const RESOURCE_ACTIONS: Record<ResourceType, PermissionAction[]> = {
  GROUP: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MANAGE,
  ],
  MEMBER: [
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MANAGE,
  ],
  ROLE: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MANAGE,
  ],
  MCP_SERVER_CONFIG: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MANAGE,
  ],
  TOOL_GROUP: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MANAGE,
  ],
  MCP_SERVER_INSTANCE: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MANAGE,
  ],
};

/**
 * アクションの表示名を取得
 */
export const getActionDisplayName = (action: PermissionAction): string => {
  const actionNames: Record<PermissionAction, string> = {
    [PermissionAction.CREATE]: "作成",
    [PermissionAction.READ]: "読み取り",
    [PermissionAction.UPDATE]: "編集",
    [PermissionAction.DELETE]: "削除",
    [PermissionAction.MANAGE]: "管理",
  };

  return actionNames[action];
};

/**
 * リソースタイプの表示名を取得
 */
export const getResourceTypeDisplayName = (resourceType: ResourceType): string => {
  const resourceNames: Record<ResourceType, string> = {
    [ResourceType.GROUP]: "グループ",
    [ResourceType.MEMBER]: "メンバー",
    [ResourceType.ROLE]: "ロール",
    [ResourceType.MCP_SERVER_CONFIG]: "MCPサーバー設定",
    [ResourceType.TOOL_GROUP]: "ツールグループ",
    [ResourceType.MCP_SERVER_INSTANCE]: "MCPサーバーインスタンス",
  };

  return resourceNames[resourceType];
};

/**
 * アクションの重要度を取得（表示順序用）
 */
export const getActionPriority = (action: PermissionAction): number => {
  const priorities: Record<PermissionAction, number> = {
    [PermissionAction.READ]: 1,
    [PermissionAction.CREATE]: 2,
    [PermissionAction.UPDATE]: 3,
    [PermissionAction.DELETE]: 4,
    [PermissionAction.MANAGE]: 5,
  };

  return priorities[action];
};

/**
 * リソースタイプに対して利用可能なアクションを取得
 */
export const getAvailableActions = (resourceType: ResourceType): PermissionAction[] => {
  return RESOURCE_ACTIONS[resourceType] ?? [];
};

/**
 * アクションが指定されたリソースタイプで利用可能かチェック
 */
export const isActionAvailable = (
  resourceType: ResourceType,
  action: PermissionAction
): boolean => {
  return RESOURCE_ACTIONS[resourceType]?.includes(action) ?? false;
};

/**
 * 権限の組み合わせを検証する
 */
export const validatePermissionCombination = (
  allowedActions: PermissionAction[],
  deniedActions: PermissionAction[]
): { isValid: boolean; conflicts: PermissionAction[] } => {
  const conflicts = allowedActions.filter(action => 
    deniedActions.includes(action)
  );

  return {
    isValid: conflicts.length === 0,
    conflicts,
  };
};

/**
 * 権限マトリックスのデータを生成する
 */
export const generatePermissionMatrix = (
  subjects: Array<{ id: string; name: string; type: 'member' | 'group' }>,
  resourceTypes: ResourceType[]
): Array<{
  subjectId: string;
  subjectName: string;
  subjectType: 'member' | 'group';
  permissions: Record<ResourceType, Record<PermissionAction, boolean>>;
}> => {
  return subjects.map(subject => ({
    subjectId: subject.id,
    subjectName: subject.name,
    subjectType: subject.type,
    permissions: resourceTypes.reduce((acc, resourceType) => {
      acc[resourceType] = getAvailableActions(resourceType).reduce((actionAcc, action) => {
        actionAcc[action] = false; // デフォルトは無効
        return actionAcc;
      }, {} as Record<PermissionAction, boolean>);
      return acc;
    }, {} as Record<ResourceType, Record<PermissionAction, boolean>>),
  }));
};

/**
 * 権限の継承関係を計算する
 */
export const calculateInheritedPermissions = (
  directPermissions: PermissionAction[],
  rolePermissions: PermissionAction[],
  groupPermissions: PermissionAction[],
  deniedActions: PermissionAction[]
): {
  effective: PermissionAction[];
  inherited: PermissionAction[];
  denied: PermissionAction[];
} => {
  // 全ての許可権限を統合
  const allAllowed = [
    ...new Set([
      ...directPermissions,
      ...rolePermissions,
      ...groupPermissions,
    ])
  ];

  // 拒否権限が最優先
  const effective = allAllowed.filter(action => 
    !deniedActions.includes(action)
  );

  // 継承された権限（直接権限以外）
  const inherited = effective.filter(action => 
    !directPermissions.includes(action)
  );

  return {
    effective,
    inherited,
    denied: deniedActions,
  };
};