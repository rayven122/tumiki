"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  getPermissionMatrix,
  PERMISSION_LABELS,
  RESOURCE_TYPE_LABELS,
  type Permission,
} from "@/lib/permissions";
import { type ResourceType, PermissionAction } from "@tumiki/db";

interface PermissionMatrixProps {
  selectedPermissions: Permission[];
  onPermissionsChange: (permissions: Permission[]) => void;
}

export const PermissionMatrix = ({
  selectedPermissions,
  onPermissionsChange,
}: PermissionMatrixProps) => {
  const matrix = getPermissionMatrix();
  const resourceTypes = Object.keys(matrix) as ResourceType[];
  const allActions = Object.values(PermissionAction);

  const isPermissionSelected = (
    resourceType: ResourceType,
    action: PermissionAction,
  ): boolean => {
    return selectedPermissions.some(
      (p) => p.resourceType === resourceType && p.action === action,
    );
  };

  const togglePermission = (
    resourceType: ResourceType,
    action: PermissionAction,
  ) => {
    const isSelected = isPermissionSelected(resourceType, action);

    if (isSelected) {
      // Remove permission
      const newPermissions = selectedPermissions.filter(
        (p) => !(p.resourceType === resourceType && p.action === action),
      );
      onPermissionsChange(newPermissions);
    } else {
      // Add permission
      const newPermissions = [...selectedPermissions, { resourceType, action }];
      onPermissionsChange(newPermissions);
    }
  };

  const toggleAllForResource = (resourceType: ResourceType) => {
    const availableActions = matrix[resourceType] || [];
    const allSelected = availableActions.every((action) =>
      isPermissionSelected(resourceType, action),
    );

    if (allSelected) {
      // Remove all permissions for this resource
      const newPermissions = selectedPermissions.filter(
        (p) => p.resourceType !== resourceType,
      );
      onPermissionsChange(newPermissions);
    } else {
      // Add all permissions for this resource
      const newPermissions = selectedPermissions.filter(
        (p) => p.resourceType !== resourceType,
      );
      availableActions.forEach((action) => {
        newPermissions.push({ resourceType, action });
      });
      onPermissionsChange(newPermissions);
    }
  };

  const toggleAllForAction = (action: PermissionAction) => {
    const resourcesWithAction = resourceTypes.filter((resourceType) =>
      matrix[resourceType]?.includes(action),
    );

    const allSelected = resourcesWithAction.every((resourceType) =>
      isPermissionSelected(resourceType, action),
    );

    if (allSelected) {
      // Remove this action from all resources
      const newPermissions = selectedPermissions.filter(
        (p) => p.action !== action,
      );
      onPermissionsChange(newPermissions);
    } else {
      // Add this action to all applicable resources
      const newPermissions = selectedPermissions.filter(
        (p) => p.action !== action,
      );
      resourcesWithAction.forEach((resourceType) => {
        newPermissions.push({ resourceType, action });
      });
      onPermissionsChange(newPermissions);
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">リソース</TableHead>
            {allActions.map((action) => {
              const applicableResources = resourceTypes.filter((resourceType) =>
                matrix[resourceType]?.includes(action),
              );
              const allSelected =
                applicableResources.length > 0 &&
                applicableResources.every((resourceType) =>
                  isPermissionSelected(resourceType, action),
                );
              const someSelected = applicableResources.some((resourceType) =>
                isPermissionSelected(resourceType, action),
              );

              return (
                <TableHead key={action} className="text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs">{PERMISSION_LABELS[action]}</span>
                    <Checkbox
                      checked={allSelected}
                      ref={(ref) => {
                        if (ref && ref instanceof HTMLInputElement) {
                          ref.indeterminate = someSelected && !allSelected;
                        }
                      }}
                      onCheckedChange={() => toggleAllForAction(action)}
                    />
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resourceTypes.map((resourceType) => {
            const availableActions = matrix[resourceType] || [];
            const selectedCount = availableActions.filter((action) =>
              isPermissionSelected(resourceType, action),
            ).length;
            const allSelected =
              availableActions.length > 0 &&
              selectedCount === availableActions.length;
            const someSelected = selectedCount > 0;

            return (
              <TableRow key={resourceType}>
                <TableCell>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        ref={(ref) => {
                          if (ref && ref instanceof HTMLInputElement) {
                            ref.indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onCheckedChange={() =>
                          toggleAllForResource(resourceType)
                        }
                      />
                      <span className="font-medium">
                        {RESOURCE_TYPE_LABELS[resourceType]}
                      </span>
                    </div>
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCount}/{availableActions.length}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {allActions.map((action) => {
                  const isAvailable = availableActions.includes(action);
                  const isSelected =
                    isAvailable && isPermissionSelected(resourceType, action);

                  return (
                    <TableCell key={action} className="text-center">
                      {isAvailable ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            togglePermission(resourceType, action)
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {selectedPermissions.length > 0 && (
        <div className="bg-muted/50 border-t p-4">
          <div className="text-muted-foreground mb-2 text-sm">
            選択中の権限: {selectedPermissions.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedPermissions.map((permission, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {RESOURCE_TYPE_LABELS[permission.resourceType]} -{" "}
                {PERMISSION_LABELS[permission.action]}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
