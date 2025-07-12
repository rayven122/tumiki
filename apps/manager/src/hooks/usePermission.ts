import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/trpc/react";
import type { PermissionAction, ResourceType } from "@tumiki/db";
import type { Permission } from "@/lib/permissions";
import { hasPermission, hasAllPermissions } from "@/lib/permissions";

/**
 * 権限チェック用のHook
 */
export const usePermission = (organizationId?: string) => {
  const { data: session } = useSession();
  
  // 組織のロール情報を取得（organizationIdが指定されている場合のみ）
  const { data: roles, isLoading } = trpc.organizationRole.getByOrganization.useQuery(
    { organizationId: organizationId! },
    { 
      enabled: !!organizationId && !!session?.user?.id,
      staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    }
  );

  // 組織のメンバー情報を取得（権限チェック用）
  const { data: organizationData } = trpc.organization.getUserOrganizations.useQuery(
    {},
    {
      enabled: !!session?.user?.id,
      staleTime: 5 * 60 * 1000,
    }
  );

  // ユーザーの権限リストを計算
  const userPermissions = useMemo((): Permission[] => {
    if (!session?.user?.id || !organizationId || !roles || !organizationData) {
      return [];
    }

    // 現在の組織でのメンバーシップを確認
    const currentOrganization = organizationData.find(org => org.id === organizationId);
    if (!currentOrganization) {
      return [];
    }

    // 管理者の場合はすべての権限を持つ（実装は後回し）
    // const isAdmin = currentOrganization.isAdmin; // この情報が必要
    
    // ユーザーが持つロールの権限を収集（簡略化された実装）
    // 実際の実装では、OrganizationMemberテーブルからユーザーのロールを取得する必要がある
    const permissions: Permission[] = [];
    
    // 現在は全ロールの権限を返す（実際の実装では条件分岐が必要）
    roles.forEach(role => {
      role.permissions.forEach(permission => {
        permissions.push({
          resourceType: permission.resourceType,
          action: permission.action,
        });
      });
    });

    // 重複を削除
    return permissions.filter((permission, index, self) =>
      index === self.findIndex(p => 
        p.resourceType === permission.resourceType && p.action === permission.action
      )
    );
  }, [session?.user?.id, organizationId, roles, organizationData]);

  /**
   * 指定した権限を持っているかチェック
   */
  const checkPermission = (resourceType: ResourceType, action: PermissionAction): boolean => {
    if (!session?.user?.id || !organizationId) {
      return false;
    }

    return hasPermission(userPermissions, { resourceType, action });
  };

  /**
   * 複数の権限をすべて持っているかチェック
   */
  const checkAllPermissions = (requiredPermissions: Permission[]): boolean => {
    if (!session?.user?.id || !organizationId) {
      return false;
    }

    return hasAllPermissions(userPermissions, requiredPermissions);
  };

  /**
   * 管理者権限を持っているかチェック
   */
  const isAdmin = useMemo((): boolean => {
    if (!session?.user?.id || !organizationId || !organizationData) {
      return false;
    }

    // 現在の組織でのメンバーシップを確認
    const currentOrganization = organizationData.find(org => org.id === organizationId);
    if (!currentOrganization) {
      return false;
    }

    // TODO: 実際の管理者チェックロジックを実装
    // OrganizationMemberのisAdminフィールドをチェック
    // 現在は仮の実装
    return false;
  }, [session?.user?.id, organizationId, organizationData]);

  /**
   * 読み取り権限を持っているかチェック
   */
  const canRead = (resourceType: ResourceType): boolean => {
    return isAdmin || checkPermission(resourceType, "READ");
  };

  /**
   * 作成権限を持っているかチェック
   */
  const canCreate = (resourceType: ResourceType): boolean => {
    return isAdmin || checkPermission(resourceType, "CREATE");
  };

  /**
   * 編集権限を持っているかチェック
   */
  const canUpdate = (resourceType: ResourceType): boolean => {
    return isAdmin || checkPermission(resourceType, "UPDATE");
  };

  /**
   * 削除権限を持っているかチェック
   */
  const canDelete = (resourceType: ResourceType): boolean => {
    return isAdmin || checkPermission(resourceType, "DELETE");
  };

  /**
   * 管理権限を持っているかチェック
   */
  const canManage = (resourceType: ResourceType): boolean => {
    return isAdmin || checkPermission(resourceType, "MANAGE");
  };

  return {
    userPermissions,
    isLoading,
    isAdmin,
    checkPermission,
    checkAllPermissions,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManage,
  };
};