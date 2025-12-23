"use client";

import { useState } from "react";
import { Plus, Trash2, Server, FileCode, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// 全リソースを表す特別な値（空文字列はSelectItemで使用不可のため）
const ALL_RESOURCES_VALUE = "__all__";

type ResourceType = "MCP_SERVER_CONFIG" | "MCP_SERVER" | "MCP_SERVER_TEMPLATE";

export type Permission = {
  resourceType: ResourceType;
  resourceId: string;
  read: boolean;
  write: boolean;
  execute: boolean;
};

type PermissionSelectorProps = {
  value: Permission[];
  onChange: (permissions: Permission[]) => void;
};

const RESOURCE_TYPE_CONFIG: Record<
  ResourceType,
  { label: string; icon: typeof Server; color: string }
> = {
  MCP_SERVER: {
    label: "MCPサーバー",
    icon: Server,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  MCP_SERVER_CONFIG: {
    label: "サーバー設定",
    icon: FileCode,
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
  },
  MCP_SERVER_TEMPLATE: {
    label: "テンプレート",
    icon: Layout,
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
};

export const PermissionSelector = ({
  value,
  onChange,
}: PermissionSelectorProps) => {
  const [newPermission, setNewPermission] = useState<{
    resourceType: ResourceType;
    resourceId: string;
    read: boolean;
    write: boolean;
    execute: boolean;
  }>({
    resourceType: "MCP_SERVER",
    resourceId: ALL_RESOURCES_VALUE,
    read: false,
    write: false,
    execute: false,
  });

  const handleAdd = () => {
    // 少なくとも1つの権限が有効かチェック
    if (!newPermission.read && !newPermission.write && !newPermission.execute) {
      return;
    }

    // 実際に保存するresourceId（ALL_RESOURCES_VALUEの場合は空文字列に変換）
    const actualResourceId =
      newPermission.resourceId === ALL_RESOURCES_VALUE
        ? ""
        : newPermission.resourceId;

    // 同じリソースタイプ+リソースIDの組み合わせが既に存在するかチェック
    const exists = value.some(
      (p) =>
        p.resourceType === newPermission.resourceType &&
        p.resourceId === actualResourceId,
    );

    if (exists) {
      return;
    }

    onChange([
      ...value,
      {
        ...newPermission,
        resourceId: actualResourceId,
      },
    ]);

    // リセット
    setNewPermission({
      resourceType: "MCP_SERVER",
      resourceId: ALL_RESOURCES_VALUE,
      read: false,
      write: false,
      execute: false,
    });
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<Permission>) => {
    onChange(value.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const getResourceConfig = (resourceType: ResourceType) =>
    RESOURCE_TYPE_CONFIG[resourceType];

  const canAdd =
    newPermission.read || newPermission.write || newPermission.execute;

  return (
    <div className="space-y-4">
      {/* 既存権限リスト */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((perm, index) => {
            const config = getResourceConfig(perm.resourceType);
            const Icon = config.icon;

            return (
              <div
                key={index}
                className="bg-muted/30 flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border",
                      config.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {config.label}
                      </span>
                      {!perm.resourceId && (
                        <Badge variant="secondary" className="text-xs">
                          全リソース
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex gap-2">
                      {["read", "write", "execute"].map((permType) => {
                        const isChecked = perm[
                          permType as keyof typeof perm
                        ] as boolean;
                        const labels = { read: "R", write: "W", execute: "X" };
                        return (
                          <button
                            key={permType}
                            type="button"
                            onClick={() =>
                              handleUpdate(index, { [permType]: !isChecked })
                            }
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded text-xs font-medium transition-colors",
                              isChecked
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80",
                            )}
                          >
                            {labels[permType as keyof typeof labels]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* 新規追加セクション */}
      <div className="rounded-lg border border-dashed p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* リソースタイプ */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              リソースタイプ
            </Label>
            <Select
              value={newPermission.resourceType}
              onValueChange={(value) =>
                setNewPermission({
                  ...newPermission,
                  resourceType: value as ResourceType,
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESOURCE_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="h-4 w-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 対象範囲 */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">対象範囲</Label>
            <Select
              value={newPermission.resourceId}
              onValueChange={(value) =>
                setNewPermission({ ...newPermission, resourceId: value })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_RESOURCES_VALUE}>全リソース</SelectItem>
                {/* TODO: 個別サーバーの一覧を取得して表示 */}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 権限チェックボックス */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-4">
            {[
              { id: "read", label: "閲覧", key: "read" as const },
              { id: "write", label: "編集", key: "write" as const },
              { id: "execute", label: "実行", key: "execute" as const },
            ].map((item) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <Checkbox
                  id={`new-${item.id}`}
                  checked={newPermission[item.key]}
                  onCheckedChange={(checked) =>
                    setNewPermission({
                      ...newPermission,
                      [item.key]: !!checked,
                    })
                  }
                />
                <Label
                  htmlFor={`new-${item.id}`}
                  className="cursor-pointer text-sm"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            size="sm"
            className="h-8"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            追加
          </Button>
        </div>
      </div>

      {/* 空の状態 */}
      {value.length === 0 && (
        <p className="text-muted-foreground text-center text-xs">
          権限を追加すると、ここに表示されます
        </p>
      )}
    </div>
  );
};
