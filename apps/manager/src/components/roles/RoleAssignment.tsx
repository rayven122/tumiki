"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
// import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
// import { type RoleWithPermissions } from "@/lib/permissions";

interface RoleAssignmentProps {
  organizationId: string;
  memberId?: string;
  _groupId?: string;
  currentRoleIds?: string[];
  onAssignmentChange?: (roleIds: string[]) => void;
}

export const RoleAssignment = ({
  organizationId,
  memberId,
  _groupId,
  currentRoleIds = [],
  onAssignmentChange,
}: RoleAssignmentProps) => {
  const [selectedRoleIds, setSelectedRoleIds] =
    useState<string[]>(currentRoleIds);

  const { data: roles, isLoading } =
    api.organizationRole.getByOrganization.useQuery({
      organizationId,
    });

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const newSelectedRoleIds = checked
      ? [...selectedRoleIds, roleId]
      : selectedRoleIds.filter((id) => id !== roleId);

    setSelectedRoleIds(newSelectedRoleIds);
    onAssignmentChange?.(newSelectedRoleIds);
  };

  const isRoleSelected = (roleId: string): boolean => {
    return selectedRoleIds.includes(roleId);
  };

  if (isLoading) {
    return <div>ロールを読み込み中...</div>;
  }

  if (!roles || roles.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground">
            利用可能なロールがありません。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">ロール割り当て</h3>
        <p className="text-muted-foreground text-sm">
          {memberId ? "メンバー" : "グループ"}
          に割り当てるロールを選択してください。
        </p>
      </div>

      <div className="grid gap-3">
        {roles.map((role) => {
          const isSelected = isRoleSelected(role.id);

          return (
            <Card
              key={role.id}
              className={isSelected ? "ring-primary ring-2" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleRoleToggle(role.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`role-${role.id}`}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <CardTitle className="flex items-center gap-2 text-base">
                        {role.name}
                        {role.isDefault && (
                          <Badge
                            variant="default"
                            className="flex items-center gap-1"
                          >
                            <Crown className="h-3 w-3" />
                            デフォルト
                          </Badge>
                        )}
                      </CardTitle>
                    </Label>
                    {role.description && (
                      <CardDescription className="mt-1">
                        {role.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isSelected && role.permissions.length > 0 && (
                <CardContent className="pt-0">
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-2">
                      このロールの権限 ({role.permissions.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 5).map((permission, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {permission.resourceType} - {permission.action}
                        </Badge>
                      ))}
                      {role.permissions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {selectedRoleIds.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="text-sm">
              <p className="mb-2 font-medium">
                選択されたロール ({selectedRoleIds.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedRoleIds.map((roleId) => {
                  const role = roles.find((r) => r.id === roleId);
                  return (
                    <Badge key={roleId} variant="default" className="text-xs">
                      {role?.name ?? roleId}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
