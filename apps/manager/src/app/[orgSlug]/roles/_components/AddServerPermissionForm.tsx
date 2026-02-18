"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { McpPermission, McpServerOption } from "./PermissionSelector";
import { ServerIcon } from "./ServerIcon";

type AddServerPermissionFormProps = {
  availableServers: McpServerOption[];
  defaultAccess: boolean;
  defaultManage: boolean;
  isLoading: boolean;
  onAdd: (permission: McpPermission) => void;
};

/**
 * サーバー権限追加フォーム
 * 新しいMCPサーバー固有権限を追加するためのフォーム
 */
export const AddServerPermissionForm = ({
  availableServers,
  defaultAccess,
  defaultManage,
  isLoading,
  onAdd,
}: AddServerPermissionFormProps) => {
  const [newPermission, setNewPermission] = useState<{
    mcpServerId: string;
    access: boolean;
    manage: boolean;
  }>({
    mcpServerId: "",
    access: false,
    manage: false,
  });

  const handleAdd = () => {
    if (!newPermission.mcpServerId) {
      return;
    }

    // デフォルトでONでない権限のうち、少なくとも1つが有効かチェック
    const hasNewPermission =
      (newPermission.access && !defaultAccess) ||
      (newPermission.manage && !defaultManage);

    if (!hasNewPermission) {
      return;
    }

    onAdd({
      mcpServerId: newPermission.mcpServerId,
      // デフォルトでONの権限はfalseにする（重複を避ける）
      access: newPermission.access && !defaultAccess,
      manage: newPermission.manage && !defaultManage,
    });

    setNewPermission({
      mcpServerId: "",
      access: false,
      manage: false,
    });
  };

  const canAdd =
    newPermission.mcpServerId &&
    ((newPermission.access && !defaultAccess) ||
      (newPermission.manage && !defaultManage));

  return (
    <div className="rounded-lg border border-dashed p-4">
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">サーバーを追加</Label>
        <Select
          value={newPermission.mcpServerId}
          onValueChange={(val) =>
            setNewPermission({ ...newPermission, mcpServerId: val })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="h-9">
            <SelectValue
              placeholder={isLoading ? "読み込み中..." : "サーバーを選択"}
            />
          </SelectTrigger>
          <SelectContent>
            {availableServers.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex items-center gap-2">
                  <ServerIcon iconPath={option.iconPath} size="sm" />
                  {option.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {newPermission.mcpServerId && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  newPermission.access || defaultAccess
                    ? "bg-blue-500"
                    : "bg-muted-foreground/30",
                )}
              />
              <span
                className={cn(
                  "text-sm",
                  defaultAccess && "text-muted-foreground",
                )}
              >
                アクセス
                {defaultAccess && (
                  <span className="ml-1 text-xs">(デフォルト)</span>
                )}
              </span>
            </div>
            <Switch
              checked={newPermission.access || defaultAccess}
              disabled={defaultAccess}
              onCheckedChange={(checked) =>
                setNewPermission({ ...newPermission, access: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  newPermission.manage || defaultManage
                    ? "bg-green-500"
                    : "bg-muted-foreground/30",
                )}
              />
              <span
                className={cn(
                  "text-sm",
                  defaultManage && "text-muted-foreground",
                )}
              >
                管理
                {defaultManage && (
                  <span className="ml-1 text-xs">(デフォルト)</span>
                )}
              </span>
            </div>
            <Switch
              checked={newPermission.manage || defaultManage}
              disabled={defaultManage}
              onCheckedChange={(checked) =>
                setNewPermission({ ...newPermission, manage: checked })
              }
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={handleAdd} disabled={!canAdd} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          追加
        </Button>
      </div>
    </div>
  );
};
