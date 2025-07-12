import { useMemo } from "react";
import { PermissionAction, ResourceType } from "@tumiki/db";
import { 
  hasPermission, 
  hasAllPermissions, 
  hasAnyPermission, 
  getPermissionsForResource,
  type Permission 
} from "@/lib/permissions";
import { api } from "@/trpc/react";

// 権限チェック結果の型定義
export interface PermissionCheck {
  hasPermission: (resourceType: ResourceType, action: PermissionAction) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  getPermissionsForResource: (resourceType: ResourceType) => PermissionAction[];
  canCreate: (resourceType: ResourceType) => boolean;
  canRead: (resourceType: ResourceType) => boolean;
  canUpdate: (resourceType: ResourceType) => boolean;
  canDelete: (resourceType: ResourceType) => boolean;
  canManage: (resourceType: ResourceType) => boolean;
  permissions: Permission[];
  isLoading: boolean;
  error: Error | null;
}

// 組織内での権限チェックHook
export const usePermission = (organizationId: string): PermissionCheck => {
  // 組織のロール一覧を取得
  const { 
    data: roles, 
    isLoading, 
    error 
  } = api.organizationRole.getByOrganization.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
    }
  );

  // 現在のユーザーの権限を計算
  const userPermissions = useMemo(() => {
    if (!roles) return [];

    // ユーザーが持つ全てのロールから権限を収集
    const allPermissions: Permission[] = [];
    
    for (const role of roles) {
      // ユーザーが直接このロールを持っているかチェック
      const hasDirectRole = role.members.length > 0;
      // またはユーザーが所属するグループがこのロールを持っているかチェック
      // TODO: グループ機能が実装されたら、ユーザーのグループメンバーシップもチェック
      
      if (hasDirectRole) {
        allPermissions.push(
          ...role.permissions.map((perm) => ({
            resourceType: perm.resourceType,
            action: perm.action,
          }))
        );
      }
    }

    // 重複を削除
    const uniquePermissions = Array.from(
      new Map(
        allPermissions.map((perm) => [
          `${perm.resourceType}:${perm.action}`,
          perm,
        ])
      ).values()
    );

    return uniquePermissions;
  }, [roles]);

  // 権限チェック関数をメモ化
  const permissionCheck = useMemo<PermissionCheck>(() => ({
    hasPermission: (resourceType: ResourceType, action: PermissionAction) =>
      hasPermission(userPermissions, resourceType, action),

    hasAllPermissions: (permissions: Permission[]) =>
      hasAllPermissions(userPermissions, permissions),

    hasAnyPermission: (permissions: Permission[]) =>
      hasAnyPermission(userPermissions, permissions),

    getPermissionsForResource: (resourceType: ResourceType) =>
      getPermissionsForResource(userPermissions, resourceType),

    canCreate: (resourceType: ResourceType) =>
      hasPermission(userPermissions, resourceType, PermissionAction.CREATE),

    canRead: (resourceType: ResourceType) =>
      hasPermission(userPermissions, resourceType, PermissionAction.READ),

    canUpdate: (resourceType: ResourceType) =>
      hasPermission(userPermissions, resourceType, PermissionAction.UPDATE),

    canDelete: (resourceType: ResourceType) =>
      hasPermission(userPermissions, resourceType, PermissionAction.DELETE),

    canManage: (resourceType: ResourceType) =>
      hasPermission(userPermissions, resourceType, PermissionAction.MANAGE),

    permissions: userPermissions,
    isLoading,
    error: error as Error | null,
  }), [userPermissions, isLoading, error]);

  return permissionCheck;
};

// 特定のロールに対する権限チェックHook（ロール編集時などに使用）
export const useRolePermissions = (roleId: string) => {
  // TODO: 特定のロールの権限を取得するAPIが必要な場合に実装
  // 現在はgetByOrganizationで全ロールを取得してフィルタリング
  return useMemo(() => {
    // プレースホルダー実装
    return {
      permissions: [] as Permission[],
      isLoading: false,
      error: null,
    };
  }, [roleId]);
};

// 権限チェック用のヘルパーフック
export const useCanAccess = (
  organizationId: string,
  resourceType: ResourceType,
  action: PermissionAction
) => {
  const { hasPermission: checkPermission, isLoading, error } = usePermission(organizationId);
  
  return {
    canAccess: checkPermission(resourceType, action),
    isLoading,
    error,
  };
};

// 複数の権限チェック用のヘルパーフック
export const useCanAccessAny = (
  organizationId: string,
  permissions: Permission[]
) => {
  const { hasAnyPermission, isLoading, error } = usePermission(organizationId);
  
  return {
    canAccess: hasAnyPermission(permissions),
    isLoading,
    error,
  };
};

// 複数の権限チェック用のヘルパーフック（全て必要）
export const useCanAccessAll = (
  organizationId: string,
  permissions: Permission[]
) => {
  const { hasAllPermissions, isLoading, error } = usePermission(organizationId);
  
  return {
    canAccess: hasAllPermissions(permissions),
    isLoading,
    error,
  };
};