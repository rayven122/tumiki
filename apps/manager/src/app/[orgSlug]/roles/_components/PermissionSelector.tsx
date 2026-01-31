"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Server,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// MCPサーバー固有の追加権限（UI用の簡素化された型）
export type McpPermission = {
  mcpServerId: string;
  access: boolean; // read + execute として統合
  manage: boolean; // write
};

export type McpServerOption = {
  id: string;
  name: string;
  iconPath?: string | null;
};

type PermissionSelectorProps = {
  // デフォルト権限（全MCPサーバーに適用）- UI上は「アクセス」「管理」
  defaultAccess: boolean; // read && execute を統合
  defaultManage: boolean; // write
  onDefaultChange: (key: "access" | "manage", value: boolean) => void;
  // サーバー固有権限
  mcpPermissions: McpPermission[];
  onMcpPermissionsChange: (permissions: McpPermission[]) => void;
  // MCPサーバー選択肢
  mcpServers: McpServerOption[];
  isLoading?: boolean;
};

export const PermissionSelector = ({
  defaultAccess,
  defaultManage,
  onDefaultChange,
  mcpPermissions,
  onMcpPermissionsChange,
  mcpServers,
  isLoading = false,
}: PermissionSelectorProps) => {
  const [isDefaultPermissionsOpen, setIsDefaultPermissionsOpen] =
    useState(true);
  const [isServerPermissionsOpen, setIsServerPermissionsOpen] = useState(
    mcpPermissions.length > 0,
  );
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
        access: newPermission.access && !defaultAccess,
        manage: newPermission.manage && !defaultManage,
      },
    ]);

    setNewPermission({
      mcpServerId: "",
      access: false,
      manage: false,
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
    ((newPermission.access && !defaultAccess) ||
      (newPermission.manage && !defaultManage));

  // 既に追加されたmcpServerIdを除外した選択可能なオプション
  const availableOptions = mcpServers.filter(
    (server) => !mcpPermissions.some((p) => p.mcpServerId === server.id),
  );

  // サーバー情報を取得するヘルパー
  const getServerInfo = (
    mcpServerId: string,
  ): { name: string; iconPath?: string | null } => {
    const server = mcpServers.find((s) => s.id === mcpServerId);
    return {
      name: server?.name ?? "不明なサーバー",
      iconPath: server?.iconPath,
    };
  };

  // サーバーアイコンをレンダリングするヘルパー
  const renderServerIcon = (
    iconPath?: string | null,
    fallbackColor = "blue",
  ) => {
    if (iconPath) {
      return (
        <div className="relative h-8 w-8 overflow-hidden rounded-md border">
          <Image
            src={iconPath}
            alt="Server icon"
            fill
            className="object-cover"
            sizes="32px"
          />
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border",
          fallbackColor === "blue" &&
            "border-blue-200 bg-blue-500/10 text-blue-600",
          fallbackColor === "purple" &&
            "border-purple-200 bg-purple-500/10 text-purple-600",
        )}
      >
        <Server className="h-4 w-4" />
      </div>
    );
  };

  // トグルスイッチ行のレンダリング
  const renderToggleRow = ({
    label,
    description,
    checked,
    disabled,
    onCheckedChange,
    colorClass,
  }: {
    label: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    onCheckedChange: (checked: boolean) => void;
    colorClass: string;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            checked ? colorClass : "bg-muted-foreground/30",
          )}
        />
        <div>
          <span className="text-sm font-medium">{label}</span>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* デフォルト権限（すべてのMCPサーバー）- 折りたたみ可能 */}
      <Collapsible
        open={isDefaultPermissionsOpen}
        onOpenChange={setIsDefaultPermissionsOpen}
      >
        <div className="bg-card rounded-lg border">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted/50 flex w-full items-center justify-between p-4 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-purple-200 bg-purple-500/10 text-purple-600">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium">
                    すべてのMCPサーバー
                  </span>
                  <p className="text-muted-foreground text-xs">
                    デフォルトで適用される権限
                  </p>
                </div>
              </div>
              {isDefaultPermissionsOpen ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="divide-y border-t px-4">
              {renderToggleRow({
                label: "アクセス",
                description: "MCPサーバーの閲覧と実行ができます",
                checked: defaultAccess,
                disabled: false,
                onCheckedChange: (checked) =>
                  onDefaultChange("access", checked),
                colorClass: "bg-blue-500",
              })}
              {renderToggleRow({
                label: "管理",
                description: "設定の変更や削除ができます",
                checked: defaultManage,
                disabled: false,
                onCheckedChange: (checked) =>
                  onDefaultChange("manage", checked),
                colorClass: "bg-green-500",
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* サーバー固有権限（折りたたみ式） */}
      {availableOptions.length > 0 && (
        <Collapsible
          open={isServerPermissionsOpen}
          onOpenChange={setIsServerPermissionsOpen}
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border border-dashed p-3"
            >
              <div className="flex items-center gap-2">
                <Server className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground text-sm">
                  サーバー固有の権限設定
                  {mcpPermissions.length > 0 && (
                    <span className="bg-primary/10 text-primary ml-2 rounded-full px-2 py-0.5 text-xs">
                      {mcpPermissions.length}件
                    </span>
                  )}
                </span>
              </div>
              {isServerPermissionsOpen ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-2 space-y-3">
            {/* 既存のサーバー固有権限リスト */}
            {mcpPermissions.map((perm, index) => {
              const serverInfo = getServerInfo(perm.mcpServerId);
              return (
                <div
                  key={perm.mcpServerId}
                  className="bg-card rounded-lg border p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {renderServerIcon(serverInfo.iconPath, "blue")}
                      <span className="text-sm font-medium">
                        {serverInfo.name}
                      </span>
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

                  <div className="divide-y">
                    {renderToggleRow({
                      label: "アクセス",
                      description: defaultAccess
                        ? "デフォルトで有効"
                        : "MCPサーバーの閲覧と実行",
                      checked: perm.access || defaultAccess,
                      disabled: defaultAccess,
                      onCheckedChange: (checked) =>
                        handleUpdate(index, { access: checked }),
                      colorClass: "bg-blue-500",
                    })}
                    {renderToggleRow({
                      label: "管理",
                      description: defaultManage
                        ? "デフォルトで有効"
                        : "設定の変更や削除",
                      checked: perm.manage || defaultManage,
                      disabled: defaultManage,
                      onCheckedChange: (checked) =>
                        handleUpdate(index, { manage: checked }),
                      colorClass: "bg-green-500",
                    })}
                  </div>
                </div>
              );
            })}

            {/* 新規追加セクション */}
            <div className="rounded-lg border border-dashed p-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  サーバーを追加
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
                      placeholder={
                        isLoading ? "読み込み中..." : "サーバーを選択"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex items-center gap-2">
                          {option.iconPath ? (
                            <div className="relative h-4 w-4 overflow-hidden rounded-sm">
                              <Image
                                src={option.iconPath}
                                alt={option.name}
                                fill
                                className="object-cover"
                                sizes="16px"
                              />
                            </div>
                          ) : (
                            <Server className="h-4 w-4 text-blue-500" />
                          )}
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
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={!canAdd}
                  size="sm"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  追加
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
