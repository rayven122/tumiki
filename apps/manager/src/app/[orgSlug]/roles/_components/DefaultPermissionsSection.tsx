"use client";

import { Globe, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tumiki/ui/collapsible";
import { ToggleRow } from "./ToggleRow";

type DefaultPermissionsSectionProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccess: boolean;
  defaultManage: boolean;
  onDefaultChange: (key: "access" | "manage", value: boolean) => void;
};

/**
 * デフォルト権限セクション（すべてのMCPサーバー）
 * 折りたたみ可能なデフォルト権限設定UI
 */
export const DefaultPermissionsSection = ({
  isOpen,
  onOpenChange,
  defaultAccess,
  defaultManage,
  onDefaultChange,
}: DefaultPermissionsSectionProps) => (
  <Collapsible open={isOpen} onOpenChange={onOpenChange}>
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
              <span className="text-sm font-medium">すべてのMCPサーバー</span>
              <p className="text-muted-foreground text-xs">
                デフォルトで適用される権限
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="divide-y border-t px-4">
          <ToggleRow
            label="アクセス"
            description="MCPサーバーの閲覧と実行ができます"
            checked={defaultAccess}
            disabled={false}
            onCheckedChange={(checked) => onDefaultChange("access", checked)}
            colorClass="bg-blue-500"
          />
          <ToggleRow
            label="管理"
            description="設定の変更や削除ができます"
            checked={defaultManage}
            disabled={false}
            onCheckedChange={(checked) => onDefaultChange("manage", checked)}
            colorClass="bg-green-500"
          />
        </div>
      </CollapsibleContent>
    </div>
  </Collapsible>
);
