"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Eye, User } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { OrganizationRole } from "@/server/utils/organizationPermissions";

type RoleInfo = {
  label: string;
  description: string;
  icon: typeof Shield;
};

const ASSIGNABLE_ROLE_DESCRIPTIONS: Record<
  "Admin" | "Member" | "Viewer",
  RoleInfo
> = {
  Admin: {
    label: "管理者",
    description: "組織削除以外の全機能",
    icon: Shield,
  },
  Member: {
    label: "メンバー",
    description: "MCP作成・メンバー閲覧",
    icon: User,
  },
  Viewer: {
    label: "閲覧者",
    description: "読み取り専用",
    icon: Eye,
  },
};

type MemberRoleSelectorProps = {
  memberId: string;
  memberName: string;
  currentRole: OrganizationRole;
  organizationSlug: string;
  onSuccess?: () => void;
  disabled?: boolean;
};

export const MemberRoleSelector = ({
  memberId,
  memberName,
  currentRole,
  organizationSlug,
  onSuccess,
  disabled = false,
}: MemberRoleSelectorProps) => {
  const [selectedRole, setSelectedRole] = useState<OrganizationRole | null>(
    null,
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const utils = api.useUtils();

  const updateMemberRoleMutation =
    api.organization.updateMemberRole.useMutation({
      onSuccess: () => {
        void utils.organization.getBySlug.invalidate({
          slug: organizationSlug,
        });
        toast.success("ロールを変更しました");
        setIsConfirmOpen(false);
        setSelectedRole(null);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "ロールの変更に失敗しました");
        setIsConfirmOpen(false);
        setSelectedRole(null);
      },
    });

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole as OrganizationRole);
    setIsConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedRole) return;

    updateMemberRoleMutation.mutate({
      memberId,
      newRole: selectedRole,
    });
  };

  const handleCancel = () => {
    setIsConfirmOpen(false);
    setSelectedRole(null);
  };

  const currentRoleInfo =
    currentRole !== "Owner" ? ASSIGNABLE_ROLE_DESCRIPTIONS[currentRole] : null;
  const selectedRoleInfo = selectedRole
    ? ASSIGNABLE_ROLE_DESCRIPTIONS[
        selectedRole as keyof typeof ASSIGNABLE_ROLE_DESCRIPTIONS
      ]
    : null;

  return (
    <>
      <Select
        value={currentRole}
        onValueChange={handleRoleChange}
        disabled={disabled || updateMemberRoleMutation.isPending}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(["Admin", "Member", "Viewer"] as const).map((role) => {
            const roleInfo = ASSIGNABLE_ROLE_DESCRIPTIONS[role];
            const Icon = roleInfo.icon;
            return (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{roleInfo.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ロール変更の確認</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{memberName}</span>
              のロールを変更しますか？
              <div className="mt-4 space-y-2">
                {currentRoleInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">現在:</span>
                    <span className="font-medium">{currentRoleInfo.label}</span>
                    <span className="text-muted-foreground text-xs">
                      ({currentRoleInfo.description})
                    </span>
                  </div>
                )}
                {selectedRoleInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">変更後:</span>
                    <span className="font-medium">
                      {selectedRoleInfo.label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({selectedRoleInfo.description})
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={updateMemberRoleMutation.isPending}
            >
              {updateMemberRoleMutation.isPending ? "変更中..." : "変更"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
