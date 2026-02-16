"use client";

import { Button } from "@tumiki/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { Shield, Trash2, Loader2 } from "lucide-react";
import type { GroupRoleOutput } from "@/server/utils/groupSchemas";

type GroupRoleListProps = {
  roles: GroupRoleOutput[];
  canEdit: boolean;
  onRemoveRole: (roleSlug: string) => void;
  isRemoving: boolean;
};

export const GroupRoleList = ({
  roles,
  canEdit,
  onRemoveRole,
  isRemoving,
}: GroupRoleListProps) => {
  if (roles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {roles.map((role) => (
        <div
          key={role.roleSlug}
          className="group hover:bg-muted/50 flex items-center justify-between rounded-xl border px-4 py-3 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Shield className="text-primary h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium">{role.name}</span>
              <div className="flex items-center gap-2">
                <PermissionBadges
                  read={role.defaultRead}
                  write={role.defaultWrite}
                  execute={role.defaultExecute}
                />
              </div>
            </div>
          </div>

          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveRole(role.roleSlug)}
              disabled={isRemoving}
              className="text-muted-foreground hover:text-destructive ml-2 h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * 権限バッジを表示するコンポーネント
 */
const PermissionBadges = ({
  read,
  write,
  execute,
}: {
  read: boolean;
  write: boolean;
  execute: boolean;
}) => {
  const permissions = [
    {
      key: "read",
      enabled: read,
      label: "閲覧",
      description: "ツールの情報を閲覧できます",
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      key: "write",
      enabled: write,
      label: "編集",
      description: "ツールの設定を変更できます",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
    },
    {
      key: "execute",
      enabled: execute,
      label: "実行",
      description: "ツールを実行できます",
      bgColor: "bg-orange-100",
      textColor: "text-orange-700",
    },
  ] as const;

  const enabledPermissions = permissions.filter((p) => p.enabled);

  if (enabledPermissions.length === 0) {
    return <span className="text-muted-foreground text-[10px]">権限なし</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex gap-1.5">
        {enabledPermissions.map((perm) => (
          <Tooltip key={perm.key}>
            <TooltipTrigger asChild>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${perm.bgColor} ${perm.textColor}`}
              >
                {perm.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {perm.description}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
