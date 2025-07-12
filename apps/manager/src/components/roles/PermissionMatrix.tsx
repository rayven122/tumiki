"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  RESOURCE_TYPES, 
  PERMISSION_ACTIONS,
  getResourceTypeDisplayName,
  getPermissionActionDisplayName,
  type Permission
} from "@/lib/permissions";
import type { PermissionAction, ResourceType } from "@tumiki/db";

interface PermissionMatrixProps {
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
  readonly?: boolean;
}

export const PermissionMatrix = ({ 
  permissions, 
  onChange, 
  disabled = false, 
  readonly = false 
}: PermissionMatrixProps) => {
  
  // 権限の状態を管理するためのマップ
  const permissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    permissions.forEach(permission => {
      const key = `${permission.resourceType}-${permission.action}`;
      map.set(key, true);
    });
    return map;
  }, [permissions]);

  // 権限の変更を処理
  const handlePermissionChange = (resourceType: ResourceType, action: PermissionAction, checked: boolean) => {
    if (readonly || disabled) return;

    const key = `${resourceType}-${action}`;
    const newPermissions = [...permissions];

    if (checked) {
      // 権限を追加
      if (!permissionMap.has(key)) {
        newPermissions.push({ resourceType, action });
      }
    } else {
      // 権限を削除
      const index = newPermissions.findIndex(
        p => p.resourceType === resourceType && p.action === action
      );
      if (index !== -1) {
        newPermissions.splice(index, 1);
      }
    }

    onChange(newPermissions);
  };

  // リソースタイプごとの権限カウント
  const getResourcePermissionCount = (resourceType: ResourceType): number => {
    return permissions.filter(p => p.resourceType === resourceType).length;
  };

  // アクションごとの権限カウント
  const getActionPermissionCount = (action: PermissionAction): number => {
    return permissions.filter(p => p.action === action).length;
  };

  // 全権限をトグル
  const handleSelectAll = (checked: boolean) => {
    if (readonly || disabled) return;

    if (checked) {
      // すべての権限を追加
      const allPermissions: Permission[] = [];
      Object.values(RESOURCE_TYPES).forEach(resourceType => {
        Object.values(PERMISSION_ACTIONS).forEach(action => {
          allPermissions.push({ resourceType, action });
        });
      });
      onChange(allPermissions);
    } else {
      // すべての権限を削除
      onChange([]);
    }
  };

  // リソースタイプの全権限をトグル
  const handleSelectResourceType = (resourceType: ResourceType, checked: boolean) => {
    if (readonly || disabled) return;

    const newPermissions = permissions.filter(p => p.resourceType !== resourceType);
    
    if (checked) {
      // このリソースタイプのすべての権限を追加
      Object.values(PERMISSION_ACTIONS).forEach(action => {
        newPermissions.push({ resourceType, action });
      });
    }

    onChange(newPermissions);
  };

  // アクションの全権限をトグル
  const handleSelectAction = (action: PermissionAction, checked: boolean) => {
    if (readonly || disabled) return;

    const newPermissions = permissions.filter(p => p.action !== action);
    
    if (checked) {
      // このアクションのすべての権限を追加
      Object.values(RESOURCE_TYPES).forEach(resourceType => {
        newPermissions.push({ resourceType, action });
      });
    }

    onChange(newPermissions);
  };

  const totalPermissions = Object.values(RESOURCE_TYPES).length * Object.values(PERMISSION_ACTIONS).length;
  const selectedPermissions = permissions.length;
  const allSelected = selectedPermissions === totalPermissions;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">権限マトリックス</CardTitle>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {selectedPermissions} / {totalPermissions} 権限選択中
            </Badge>
            {!readonly && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={disabled}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  すべて選択
                </label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">リソース</TableHead>
                {Object.values(PERMISSION_ACTIONS).map(action => (
                  <TableHead key={action} className="text-center min-w-[100px]">
                    <div className="flex flex-col items-center space-y-2">
                      <span>{getPermissionActionDisplayName(action)}</span>
                      {!readonly && (
                        <Checkbox
                          checked={getActionPermissionCount(action) === Object.values(RESOURCE_TYPES).length}
                          onCheckedChange={(checked) => handleSelectAction(action, !!checked)}
                          disabled={disabled}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
                {!readonly && (
                  <TableHead className="text-center">全選択</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(RESOURCE_TYPES).map(resourceType => (
                <TableRow key={resourceType}>
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-between">
                      <span>{getResourceTypeDisplayName(resourceType)}</span>
                      <Badge variant="outline" className="ml-2">
                        {getResourcePermissionCount(resourceType)}/
                        {Object.values(PERMISSION_ACTIONS).length}
                      </Badge>
                    </div>
                  </TableCell>
                  {Object.values(PERMISSION_ACTIONS).map(action => {
                    const isChecked = permissionMap.has(`${resourceType}-${action}`);
                    return (
                      <TableCell key={action} className="text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(resourceType, action, !!checked)
                          }
                          disabled={disabled || readonly}
                        />
                      </TableCell>
                    );
                  })}
                  {!readonly && (
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getResourcePermissionCount(resourceType) === Object.values(PERMISSION_ACTIONS).length}
                        onCheckedChange={(checked) => 
                          handleSelectResourceType(resourceType, !!checked)
                        }
                        disabled={disabled}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {permissions.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">選択中の権限:</h4>
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {getResourceTypeDisplayName(permission.resourceType)}・
                  {getPermissionActionDisplayName(permission.action)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};