import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { api } from "@/trpc/react";
import {
  checkPermission,
  hasManagePermission,
  type Permission,
} from "@/lib/permissions";
import { PermissionAction, ResourceType } from "@tumiki/db";

export const usePermission = (organizationId?: string) => {
  const { data: session } = useSession();

  // Get user's roles in the organization
  const { data: userRoles, isLoading } =
    api.organizationRole.getByOrganization.useQuery(
      { organizationId: organizationId! },
      { enabled: !!organizationId && !!session?.user?.id },
    );

  const userPermissions = useMemo(() => {
    if (!userRoles) return [];

    const permissions: Permission[] = [];
    userRoles.forEach((role) => {
      role.permissions.forEach((permission) => {
        // Avoid duplicates
        if (
          !permissions.some(
            (p) =>
              p.resourceType === permission.resourceType &&
              p.action === permission.action,
          )
        ) {
          permissions.push({
            resourceType: permission.resourceType,
            action: permission.action,
          });
        }
      });
    });

    return permissions;
  }, [userRoles]);

  const hasPermission = (
    resourceType: ResourceType,
    action: PermissionAction,
  ): boolean => {
    return checkPermission(userPermissions, { resourceType, action });
  };

  const canManage = (resourceType: ResourceType): boolean => {
    return hasManagePermission(userPermissions, resourceType);
  };

  const canCreate = (resourceType: ResourceType): boolean => {
    return hasPermission(resourceType, PermissionAction.CREATE);
  };

  const canRead = (resourceType: ResourceType): boolean => {
    return hasPermission(resourceType, PermissionAction.READ);
  };

  const canUpdate = (resourceType: ResourceType): boolean => {
    return hasPermission(resourceType, PermissionAction.UPDATE);
  };

  const canDelete = (resourceType: ResourceType): boolean => {
    return hasPermission(resourceType, PermissionAction.DELETE);
  };

  const isAdmin = useMemo(() => {
    // Check if user has manage permission for all resource types
    const resourceTypes = Object.values(ResourceType);
    return resourceTypes.every((resourceType) => canManage(resourceType));
  }, [userPermissions]);

  return {
    userPermissions,
    hasPermission,
    canManage,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    isAdmin,
    isLoading,
  };
};
