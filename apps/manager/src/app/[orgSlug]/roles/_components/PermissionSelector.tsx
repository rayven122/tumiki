"use client";

import { useState } from "react";
import { Plus, Trash2, Server } from "lucide-react";
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
import { cn } from "@/lib/utils";

// MCPサーバー固有の追加権限
// 「全サーバー」のデフォルト権限はOrganizationRoleのdefaultRead/Write/Executeで管理
export type McpPermission = {
  mcpServerId: string;
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type McpServerOption = {
  id: string;
  name: string;
};

type PermissionSelectorProps = {
  value: McpPermission[];
  onChange: (permissions: McpPermission[]) => void;
  mcpServers: McpServerOption[];
  isLoading?: boolean;
};

export const PermissionSelector = ({
  value,
  onChange,
  mcpServers,
  isLoading = false,
}: PermissionSelectorProps) => {
  const [newPermission, setNewPermission] = useState<{
    mcpServerId: string;
    read: boolean;
    write: boolean;
    execute: boolean;
  }>({
    mcpServerId: "",
    read: false,
    write: false,
    execute: false,
  });

  const handleAdd = () => {
    // サーバーが選択されていないか確認
    if (!newPermission.mcpServerId) {
      return;
    }

    // 少なくとも1つの権限が有効かチェック
    if (!newPermission.read && !newPermission.write && !newPermission.execute) {
      return;
    }

    // 同じmcpServerIdが既に存在するかチェック
    const exists = value.some(
      (p) => p.mcpServerId === newPermission.mcpServerId,
    );

    if (exists) {
      return;
    }

    onChange([
      ...value,
      {
        mcpServerId: newPermission.mcpServerId,
        read: newPermission.read,
        write: newPermission.write,
        execute: newPermission.execute,
      },
    ]);

    // リセット
    setNewPermission({
      mcpServerId: "",
      read: false,
      write: false,
      execute: false,
    });
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<McpPermission>) => {
    onChange(value.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const canAdd =
    newPermission.mcpServerId &&
    (newPermission.read || newPermission.write || newPermission.execute);

  // 既に追加されたmcpServerIdを除外した選択可能なオプション
  const availableOptions = mcpServers.filter(
    (server) => !value.some((p) => p.mcpServerId === server.id),
  );

  // サーバー名を取得するヘルパー
  const getServerName = (mcpServerId: string): string => {
    const server = mcpServers.find((s) => s.id === mcpServerId);
    return server?.name ?? "不明なサーバー";
  };

  return (
    <div className="space-y-4">
      {/* 既存権限リスト */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((perm, index) => (
            <div
              key={perm.mcpServerId}
              className="bg-muted/30 flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-500/10 text-blue-600">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-medium">
                    {getServerName(perm.mcpServerId)}
                  </span>
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
          ))}
        </div>
      )}

      {/* 新規追加セクション */}
      <div className="rounded-lg border border-dashed p-4">
        {/* MCPサーバー選択 */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">
            追加権限を設定するサーバー
          </Label>
          <Select
            value={newPermission.mcpServerId}
            onValueChange={(val) =>
              setNewPermission({ ...newPermission, mcpServerId: val })
            }
            disabled={isLoading || availableOptions.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={
                  isLoading
                    ? "読み込み中..."
                    : availableOptions.length === 0
                      ? "追加可能なサーバーがありません"
                      : "サーバーを選択"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-blue-500" />
                    {option.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            disabled={!canAdd || availableOptions.length === 0}
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
