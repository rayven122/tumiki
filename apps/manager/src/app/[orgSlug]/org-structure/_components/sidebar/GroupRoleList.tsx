"use client";

import { Button } from "@/components/ui/button";
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
  return (
    <div className="flex gap-1.5">
      {read && (
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
          R
        </span>
      )}
      {write && (
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
          W
        </span>
      )}
      {execute && (
        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
          X
        </span>
      )}
      {!read && !write && !execute && (
        <span className="text-muted-foreground text-[10px]">権限なし</span>
      )}
    </div>
  );
};
