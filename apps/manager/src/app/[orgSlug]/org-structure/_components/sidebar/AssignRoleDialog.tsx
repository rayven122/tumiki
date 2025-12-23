"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Plus } from "lucide-react";

type AvailableRole = {
  slug: string;
  name: string;
  description: string | null;
  defaultRead: boolean;
  defaultWrite: boolean;
  defaultExecute: boolean;
};

type AssignRoleDialogProps = {
  availableRoles: AvailableRole[];
  currentRoleSlugs: string[];
  onAssignRole: (roleSlug: string) => void;
  isAssigning: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const AssignRoleDialog = ({
  availableRoles,
  currentRoleSlugs,
  onAssignRole,
  isAssigning,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AssignRoleDialogProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedRoleSlug, setSelectedRoleSlug] = useState<string | null>(null);

  // 制御モードか非制御モードかを判定
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const setIsOpen = isControlled
    ? (open: boolean) => controlledOnOpenChange?.(open)
    : setInternalIsOpen;

  // グループに未割り当てのロールのみ表示
  const unassignedRoles = availableRoles.filter(
    (role) => !currentRoleSlugs.includes(role.slug),
  );

  // ダイアログが閉じたら選択をリセット
  useEffect(() => {
    if (!isOpen) {
      setSelectedRoleSlug(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (selectedRoleSlug) {
      onAssignRole(selectedRoleSlug);
      // 親が制御している場合は親がonSuccessで閉じる
      if (!isControlled) {
        setSelectedRoleSlug(null);
        setIsOpen(false);
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-dashed"
        >
          <Plus className="h-4 w-4" />
          ロールを追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ロールを割り当て
          </DialogTitle>
          <DialogDescription>
            グループに割り当てるロールを選択してください
          </DialogDescription>
        </DialogHeader>

        {unassignedRoles.length === 0 ? (
          <div className="bg-muted/30 flex flex-col items-center gap-2 rounded-lg py-10 text-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <Shield className="text-muted-foreground h-6 w-6" />
            </div>
            <p className="text-muted-foreground text-sm">
              追加可能なロールがありません
            </p>
            <p className="text-muted-foreground text-xs">
              すべてのロールが既に割り当てられています
            </p>
          </div>
        ) : (
          <div className="max-h-[40vh] space-y-1 overflow-y-auto pr-1">
            {unassignedRoles.map((role) => {
              const isSelected = selectedRoleSlug === role.slug;

              return (
                <button
                  key={role.slug}
                  type="button"
                  onClick={() => setSelectedRoleSlug(role.slug)}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary/50 bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <Shield className="text-primary h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium">{role.name}</span>
                    {role.description && (
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {role.description}
                      </span>
                    )}
                    <PermissionBadges
                      read={role.defaultRead}
                      write={role.defaultWrite}
                      execute={role.defaultExecute}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAssigning}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRoleSlug || isAssigning}
            className="min-w-[120px]"
          >
            {isAssigning ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                割り当て中...
              </>
            ) : (
              "割り当て"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      key: "write",
      enabled: write,
      label: "編集",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
    },
    {
      key: "execute",
      enabled: execute,
      label: "実行",
      bgColor: "bg-orange-100",
      textColor: "text-orange-700",
    },
  ] as const;

  const enabledPermissions = permissions.filter((p) => p.enabled);

  if (enabledPermissions.length === 0) {
    return <span className="text-muted-foreground text-[10px]">権限なし</span>;
  }

  return (
    <div className="flex gap-1.5">
      {enabledPermissions.map((perm) => (
        <span
          key={perm.key}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${perm.bgColor} ${perm.textColor}`}
        >
          {perm.label}
        </span>
      ))}
    </div>
  );
};
