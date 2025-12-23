"use client";

import { useState } from "react";
import { Plus, Trash2, Server, Globe } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// MCPサーバー固有の追加権限
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
  // デフォルト権限（全MCPサーバーに適用）
  defaultRead: boolean;
  defaultWrite: boolean;
  defaultExecute: boolean;
  onDefaultChange: (
    key: "defaultRead" | "defaultWrite" | "defaultExecute",
    value: boolean,
  ) => void;
  // サーバー固有権限
  mcpPermissions: McpPermission[];
  onMcpPermissionsChange: (permissions: McpPermission[]) => void;
  // MCPサーバー選択肢
  mcpServers: McpServerOption[];
  isLoading?: boolean;
};

export const PermissionSelector = ({
  defaultRead,
  defaultWrite,
  defaultExecute,
  onDefaultChange,
  mcpPermissions,
  onMcpPermissionsChange,
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
    if (!newPermission.mcpServerId) {
      return;
    }

    // デフォルトでONでない権限のうち、少なくとも1つが有効かチェック
    const hasNewPermission =
      (newPermission.read && !defaultRead) ||
      (newPermission.write && !defaultWrite) ||
      (newPermission.execute && !defaultExecute);

    if (!hasNewPermission) {
      return;
    }

    const exists = mcpPermissions.some(
      (p) => p.mcpServerId === newPermission.mcpServerId,
    );

    if (exists) {
      return;
    }

    onMcpPermissionsChange([
      ...mcpPermissions,
      {
        mcpServerId: newPermission.mcpServerId,
        // デフォルトでONの権限はfalseにする（重複を避ける）
        read: newPermission.read && !defaultRead,
        write: newPermission.write && !defaultWrite,
        execute: newPermission.execute && !defaultExecute,
      },
    ]);

    setNewPermission({
      mcpServerId: "",
      read: false,
      write: false,
      execute: false,
    });
  };

  const handleRemove = (index: number) => {
    onMcpPermissionsChange(mcpPermissions.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<McpPermission>) => {
    onMcpPermissionsChange(
      mcpPermissions.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    );
  };

  const canAdd =
    newPermission.mcpServerId &&
    ((newPermission.read && !defaultRead) ||
      (newPermission.write && !defaultWrite) ||
      (newPermission.execute && !defaultExecute));

  // 既に追加されたmcpServerIdを除外した選択可能なオプション
  const availableOptions = mcpServers.filter(
    (server) => !mcpPermissions.some((p) => p.mcpServerId === server.id),
  );

  // サーバー名を取得するヘルパー
  const getServerName = (mcpServerId: string): string => {
    const server = mcpServers.find((s) => s.id === mcpServerId);
    return server?.name ?? "不明なサーバー";
  };

  // 権限ボタンのレンダリング
  const renderPermissionButton = ({
    permType,
    isChecked,
    isDisabled,
    onClick,
    disabledReason,
  }: {
    permType: "read" | "write" | "execute";
    isChecked: boolean;
    isDisabled: boolean;
    onClick: () => void;
    disabledReason?: string;
  }) => {
    const config = {
      read: {
        label: "閲覧",
        description: "ツールの情報を閲覧できます",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
        disabledBg: "bg-blue-100/50",
        disabledText: "text-blue-700/50",
      },
      write: {
        label: "編集",
        description: "ツールの設定を変更できます",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
        disabledBg: "bg-green-100/50",
        disabledText: "text-green-700/50",
      },
      execute: {
        label: "実行",
        description: "ツールを実行できます",
        bgColor: "bg-orange-100",
        textColor: "text-orange-700",
        disabledBg: "bg-orange-100/50",
        disabledText: "text-orange-700/50",
      },
    };

    const { label, description, bgColor, textColor, disabledBg, disabledText } =
      config[permType];

    const button = (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={cn(
          "flex h-6 min-w-10 items-center justify-center rounded px-1.5 text-xs font-medium transition-colors",
          isDisabled
            ? `${disabledBg} ${disabledText} cursor-not-allowed`
            : isChecked
              ? `${bgColor} ${textColor}`
              : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        {label}
      </button>
    );

    // すべてのボタンにツールチップを表示
    const tooltipContent = disabledReason ?? description;

    return (
      <Tooltip key={permType}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* デフォルト権限（すべてのMCPサーバー） */}
        <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-purple-200 bg-purple-500/10 text-purple-600">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-medium">
                すべてのMCPサーバー（デフォルト）
              </span>
              <div className="mt-1 flex gap-2">
                {renderPermissionButton({
                  permType: "read",
                  isChecked: defaultRead,
                  isDisabled: false,
                  onClick: () => onDefaultChange("defaultRead", !defaultRead),
                })}
                {renderPermissionButton({
                  permType: "write",
                  isChecked: defaultWrite,
                  isDisabled: false,
                  onClick: () => onDefaultChange("defaultWrite", !defaultWrite),
                })}
                {renderPermissionButton({
                  permType: "execute",
                  isChecked: defaultExecute,
                  isDisabled: false,
                  onClick: () =>
                    onDefaultChange("defaultExecute", !defaultExecute),
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 区切り線 */}
        {(mcpPermissions.length > 0 || availableOptions.length > 0) && (
          <div className="border-muted-foreground/20 border-t border-dashed" />
        )}

        {/* サーバー固有権限リスト */}
        {mcpPermissions.length > 0 && (
          <div className="space-y-2">
            {mcpPermissions.map((perm, index) => (
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
                      {renderPermissionButton({
                        permType: "read",
                        isChecked: perm.read || defaultRead,
                        isDisabled: defaultRead,
                        onClick: () =>
                          handleUpdate(index, { read: !perm.read }),
                        disabledReason: "デフォルト権限で有効です",
                      })}
                      {renderPermissionButton({
                        permType: "write",
                        isChecked: perm.write || defaultWrite,
                        isDisabled: defaultWrite,
                        onClick: () =>
                          handleUpdate(index, { write: !perm.write }),
                        disabledReason: "デフォルト権限で有効です",
                      })}
                      {renderPermissionButton({
                        permType: "execute",
                        isChecked: perm.execute || defaultExecute,
                        isDisabled: defaultExecute,
                        onClick: () =>
                          handleUpdate(index, { execute: !perm.execute }),
                        disabledReason: "デフォルト権限で有効です",
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
        {availableOptions.length > 0 && (
          <div className="rounded-lg border border-dashed p-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                サーバー固有の権限を追加
              </Label>
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

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-4">
                {[
                  { id: "read", label: "閲覧", key: "read" as const },
                  { id: "write", label: "編集", key: "write" as const },
                  { id: "execute", label: "実行", key: "execute" as const },
                ].map((item) => {
                  const isDefaultEnabled =
                    item.key === "read"
                      ? defaultRead
                      : item.key === "write"
                        ? defaultWrite
                        : defaultExecute;

                  return (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`new-${item.id}`}
                        checked={newPermission[item.key] || isDefaultEnabled}
                        disabled={isDefaultEnabled}
                        onCheckedChange={(checked) =>
                          setNewPermission({
                            ...newPermission,
                            [item.key]: !!checked,
                          })
                        }
                        className={cn(isDefaultEnabled && "opacity-50")}
                      />
                      <Label
                        htmlFor={`new-${item.id}`}
                        className={cn(
                          "cursor-pointer text-sm",
                          isDefaultEnabled && "text-muted-foreground",
                        )}
                      >
                        {item.label}
                        {isDefaultEnabled && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            (デフォルト)
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
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
        )}
      </div>
    </TooltipProvider>
  );
};
