"use client";

import { useState } from "react";
import { Server, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tumiki/ui/collapsible";
import { DefaultPermissionsSection } from "./DefaultPermissionsSection";
import { ServerPermissionCard } from "./ServerPermissionCard";
import { AddServerPermissionForm } from "./AddServerPermissionForm";

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

  const handleAdd = (permission: McpPermission) => {
    const exists = mcpPermissions.some(
      (p) => p.mcpServerId === permission.mcpServerId,
    );

    if (exists) {
      return;
    }

    onMcpPermissionsChange([...mcpPermissions, permission]);
  };

  const handleRemove = (index: number) => {
    onMcpPermissionsChange(mcpPermissions.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<McpPermission>) => {
    onMcpPermissionsChange(
      mcpPermissions.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    );
  };

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

  return (
    <div className="space-y-4">
      {/* デフォルト権限（すべてのMCPサーバー）- 折りたたみ可能 */}
      <DefaultPermissionsSection
        isOpen={isDefaultPermissionsOpen}
        onOpenChange={setIsDefaultPermissionsOpen}
        defaultAccess={defaultAccess}
        defaultManage={defaultManage}
        onDefaultChange={onDefaultChange}
      />

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
                <ServerPermissionCard
                  key={perm.mcpServerId}
                  permission={perm}
                  serverName={serverInfo.name}
                  serverIconPath={serverInfo.iconPath}
                  defaultAccess={defaultAccess}
                  defaultManage={defaultManage}
                  onUpdate={(updates) => handleUpdate(index, updates)}
                  onRemove={() => handleRemove(index)}
                />
              );
            })}

            {/* 新規追加セクション */}
            <AddServerPermissionForm
              availableServers={availableOptions}
              defaultAccess={defaultAccess}
              defaultManage={defaultManage}
              isLoading={isLoading}
              onAdd={handleAdd}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
