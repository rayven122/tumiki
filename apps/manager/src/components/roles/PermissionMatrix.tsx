"use client";

import { useState, useCallback } from "react";
import { PermissionAction, ResourceType } from "@tumiki/db";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PERMISSION_SETS, 
  getResourceTypeDisplayName, 
  getActionDisplayName,
  type Permission,
} from "@/lib/permissions";

interface PermissionMatrixProps {
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

const ACTIONS = [
  PermissionAction.READ,
  PermissionAction.CREATE,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
  PermissionAction.MANAGE,
];

const RESOURCES = [
  ResourceType.GROUP,
  ResourceType.MEMBER,
  ResourceType.ROLE,
  ResourceType.MCP_SERVER_CONFIG,
  ResourceType.TOOL_GROUP,
  ResourceType.MCP_SERVER_INSTANCE,
];

export const PermissionMatrix = ({ permissions, onChange, disabled = false }: PermissionMatrixProps) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // 権限がチェックされているかどうかを確認
  const isPermissionChecked = (resourceType: ResourceType, action: PermissionAction): boolean => {
    return permissions.some(
      (perm) => perm.resourceType === resourceType && perm.action === action
    );
  };

  // 単一の権限をトグル
  const togglePermission = useCallback((resourceType: ResourceType, action: PermissionAction) => {
    if (disabled) return;

    const existingIndex = permissions.findIndex(
      (perm) => perm.resourceType === resourceType && perm.action === action
    );

    let newPermissions: Permission[];
    if (existingIndex >= 0) {
      // 権限を削除
      newPermissions = permissions.filter((_, index) => index !== existingIndex);
    } else {
      // 権限を追加
      newPermissions = [...permissions, { resourceType, action }];
    }

    onChange(newPermissions);
    setSelectedPreset(null); // プリセット選択をクリア
  }, [permissions, onChange, disabled]);

  // リソース全体の権限をトグル
  const toggleResourcePermissions = useCallback((resourceType: ResourceType) => {
    if (disabled) return;

    const resourcePermissions = ACTIONS.map(action => ({ resourceType, action }));
    const allChecked = resourcePermissions.every(perm => 
      permissions.some(p => p.resourceType === perm.resourceType && p.action === perm.action)
    );

    let newPermissions: Permission[];
    if (allChecked) {
      // 全て削除
      newPermissions = permissions.filter(perm => perm.resourceType !== resourceType);
    } else {
      // 全て追加
      const otherPermissions = permissions.filter(perm => perm.resourceType !== resourceType);
      newPermissions = [...otherPermissions, ...resourcePermissions];
    }

    onChange(newPermissions);
    setSelectedPreset(null);
  }, [permissions, onChange, disabled]);

  // アクション全体の権限をトグル
  const toggleActionPermissions = useCallback((action: PermissionAction) => {
    if (disabled) return;

    const actionPermissions = RESOURCES.map(resourceType => ({ resourceType, action }));
    const allChecked = actionPermissions.every(perm => 
      permissions.some(p => p.resourceType === perm.resourceType && p.action === perm.action)
    );

    let newPermissions: Permission[];
    if (allChecked) {
      // 全て削除
      newPermissions = permissions.filter(perm => perm.action !== action);
    } else {
      // 全て追加
      const otherPermissions = permissions.filter(perm => perm.action !== action);
      newPermissions = [...otherPermissions, ...actionPermissions];
    }

    onChange(newPermissions);
    setSelectedPreset(null);
  }, [permissions, onChange, disabled]);

  // プリセットを適用
  const applyPreset = useCallback((presetName: string) => {
    if (disabled) return;

    const preset = PERMISSION_SETS[presetName as keyof typeof PERMISSION_SETS];
    if (preset) {
      onChange(preset);
      setSelectedPreset(presetName);
    }
  }, [onChange, disabled]);

  // 全ての権限をクリア
  const clearAllPermissions = useCallback(() => {
    if (disabled) return;
    onChange([]);
    setSelectedPreset(null);
  }, [onChange, disabled]);

  // リソースの権限が全てチェックされているかどうか
  const isResourceFullyChecked = (resourceType: ResourceType): boolean => {
    return ACTIONS.every(action => isPermissionChecked(resourceType, action));
  };

  // アクションの権限が全てチェックされているかどうか
  const isActionFullyChecked = (action: PermissionAction): boolean => {
    return RESOURCES.every(resourceType => isPermissionChecked(resourceType, action));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>権限マトリックス</CardTitle>
        <CardDescription>
          リソースタイプとアクションの組み合わせで権限を設定できます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* プリセット権限 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">プリセット権限</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PERMISSION_SETS).map(([name, _]) => (
              <Button
                key={name}
                variant={selectedPreset === name ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(name)}
                disabled={disabled}
              >
                {name === "ADMIN" && "管理者"}
                {name === "EDITOR" && "エディター"}
                {name === "DEVELOPER" && "開発者"}
                {name === "READ_ONLY" && "読み取り専用"}
              </Button>
            ))}
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllPermissions}
              disabled={disabled}
            >
              全てクリア
            </Button>
          </div>
        </div>

        {/* 権限マトリックス */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">詳細権限設定</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 border-r font-medium">
                      リソース
                    </th>
                    {ACTIONS.map((action) => (
                      <th key={action} className="text-center p-3 border-r last:border-r-0">
                        <div className="space-y-1">
                          <div className="text-xs font-medium">
                            {getActionDisplayName(action)}
                          </div>
                          <Checkbox
                            checked={isActionFullyChecked(action)}
                            onCheckedChange={() => toggleActionPermissions(action)}
                            disabled={disabled}
                            aria-label={`全ての${getActionDisplayName(action)}権限をトグル`}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((resourceType) => (
                    <tr key={resourceType} className="border-t hover:bg-muted/30">
                      <td className="p-3 border-r">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isResourceFullyChecked(resourceType)}
                            onCheckedChange={() => toggleResourcePermissions(resourceType)}
                            disabled={disabled}
                            aria-label={`${getResourceTypeDisplayName(resourceType)}の全権限をトグル`}
                          />
                          <span className="text-sm font-medium">
                            {getResourceTypeDisplayName(resourceType)}
                          </span>
                        </div>
                      </td>
                      {ACTIONS.map((action) => (
                        <td key={action} className="text-center p-3 border-r last:border-r-0">
                          <Checkbox
                            checked={isPermissionChecked(resourceType, action)}
                            onCheckedChange={() => togglePermission(resourceType, action)}
                            disabled={disabled}
                            aria-label={`${getResourceTypeDisplayName(resourceType)}の${getActionDisplayName(action)}権限`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 選択された権限の概要 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">選択された権限</h3>
          <div className="flex flex-wrap gap-1">
            {permissions.length === 0 ? (
              <Badge variant="outline">権限が選択されていません</Badge>
            ) : (
              permissions.map((perm, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {getResourceTypeDisplayName(perm.resourceType)} - {getActionDisplayName(perm.action)}
                </Badge>
              ))
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {permissions.length}個の権限が選択されています
          </div>
        </div>
      </CardContent>
    </Card>
  );
};