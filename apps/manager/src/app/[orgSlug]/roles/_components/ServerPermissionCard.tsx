"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import { ServerIcon } from "./ServerIcon";
import { ToggleRow } from "./ToggleRow";
import type { McpPermission } from "./PermissionSelector";

type ServerPermissionCardProps = {
  permission: McpPermission;
  serverName: string;
  serverIconPath?: string | null;
  defaultAccess: boolean;
  defaultManage: boolean;
  onUpdate: (updates: Partial<McpPermission>) => void;
  onRemove: () => void;
};

/**
 * サーバー固有権限カード
 * 個別のMCPサーバーに対する権限設定を表示・編集
 */
export const ServerPermissionCard = ({
  permission,
  serverName,
  serverIconPath,
  defaultAccess,
  defaultManage,
  onUpdate,
  onRemove,
}: ServerPermissionCardProps) => (
  <div className="bg-card rounded-lg border p-4">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ServerIcon iconPath={serverIconPath} fallbackColor="blue" />
        <span className="text-sm font-medium">{serverName}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>

    <div className="divide-y">
      <ToggleRow
        label="アクセス"
        description={
          defaultAccess ? "デフォルトで有効" : "MCPサーバーの閲覧と実行"
        }
        checked={permission.access || defaultAccess}
        disabled={defaultAccess}
        onCheckedChange={(checked) => onUpdate({ access: checked })}
        colorClass="bg-blue-500"
      />
      <ToggleRow
        label="管理"
        description={defaultManage ? "デフォルトで有効" : "設定の変更や削除"}
        checked={permission.manage || defaultManage}
        disabled={defaultManage}
        onCheckedChange={(checked) => onUpdate({ manage: checked })}
        colorClass="bg-green-500"
      />
    </div>
  </div>
);
