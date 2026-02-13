"use client";

import { useMemo, useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import type { Department } from "@/features/org-structure/utils/mock/mockOrgData";
import { MemberList } from "./MemberList";
import { AddMembersDialog } from "./AddMembersDialog";
import { IconPicker } from "./IconPicker";
import { GroupRoleList } from "./GroupRoleList";
import { AssignRoleDialog } from "./AssignRoleDialog";

type GroupDetailSidebarProps = {
  department: Department | null;
  groupId: string | null;
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
};

export const GroupDetailSidebar = ({
  department,
  groupId,
  organizationId,
  isOpen,
  onClose,
  canEdit,
}: GroupDetailSidebarProps) => {
  const utils = api.useUtils();
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false);
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<string | undefined>();

  // 部署情報が変わったら編集フォームをリセット
  useEffect(() => {
    if (department) {
      setEditName(department.name);
      setEditIcon(department.icon);
    }
    setIsEditing(false);
  }, [department]);

  // 組織メンバー一覧を取得
  const { data: orgMembersData } = api.organization.getMembers.useQuery(
    { limit: 100, offset: 0 },
    { enabled: isOpen },
  );

  // 組織メンバーをMember型に変換
  const organizationMembers = useMemo(() => {
    if (!orgMembersData?.members) return [];
    return orgMembersData.members.map((m) => ({
      id: m.userId,
      name: m.user.name ?? "名前未設定",
      email: m.user.email ?? undefined,
      avatarUrl: m.user.image ?? undefined,
      initials: getInitials(m.user.name ?? m.user.email ?? "?"),
    }));
  }, [orgMembersData]);

  // グループに割り当てられたロール一覧を取得
  const { data: groupRolesData } = api.group.listRoles.useQuery(
    { organizationId, groupId: groupId ?? "" },
    { enabled: isOpen && !!groupId },
  );

  // 組織のロール一覧を取得（割り当て可能なロール用）
  const { data: organizationRolesData } = api.role.list.useQuery(
    { includePermissions: false },
    { enabled: isOpen },
  );

  // リーダー更新
  const updateLeaderMutation = api.group.updateLeader.useMutation({
    onSuccess: () => {
      toast.success("リーダーを更新しました");
      void utils.group.list.invalidate();
      void utils.group.getMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "リーダーの更新に失敗しました");
    },
  });

  // メンバー追加（一括）
  const addMembersMutation = api.group.addMembers.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${result.addedCount}人のメンバーを追加しました`);
      } else {
        toast.warning(
          `${result.addedCount}人を追加しました（${result.failedUserIds.length}人は失敗）`,
        );
      }
      void utils.group.list.invalidate();
      void utils.group.getMembers.invalidate();
      // 成功したらダイアログを閉じる
      setIsAddMembersDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "メンバーの追加に失敗しました");
      // エラー時もダイアログを閉じる
      setIsAddMembersDialogOpen(false);
    },
  });

  // メンバー削除
  const removeMemberMutation = api.group.removeMember.useMutation({
    onSuccess: () => {
      toast.success("メンバーを削除しました");
      void utils.group.list.invalidate();
      void utils.group.getMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "メンバーの削除に失敗しました");
    },
  });

  // グループ更新
  const updateGroupMutation = api.group.update.useMutation({
    onSuccess: () => {
      toast.success("部署情報を更新しました");
      setIsEditing(false);
      void utils.group.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "部署情報の更新に失敗しました");
    },
  });

  // ロール割り当て
  const assignRoleMutation = api.group.assignRole.useMutation({
    onSuccess: () => {
      toast.success("ロールを割り当てました");
      void utils.group.listRoles.invalidate();
      setIsAssignRoleDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "ロールの割り当てに失敗しました");
      setIsAssignRoleDialogOpen(false);
    },
  });

  // ロール解除
  const removeRoleMutation = api.group.removeRole.useMutation({
    onSuccess: () => {
      toast.success("ロールを解除しました");
      void utils.group.listRoles.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "ロールの解除に失敗しました");
    },
  });

  const handleLeaderChange = (newLeaderId: string) => {
    if (!groupId) return;
    updateLeaderMutation.mutate({
      organizationId,
      groupId,
      leaderId: newLeaderId,
    });
  };

  const handleAddMembers = (userIds: string[]) => {
    if (!groupId) return;
    addMembersMutation.mutate({
      organizationId,
      groupId,
      userIds,
    });
  };

  const handleRemoveMember = (userId: string) => {
    if (!groupId) return;
    removeMemberMutation.mutate({
      organizationId,
      groupId,
      userId,
    });
  };

  const handleStartEdit = () => {
    if (!department) return;
    setEditName(department.name);
    setEditIcon(department.icon);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!department) return;
    setEditName(department.name);
    setEditIcon(department.icon);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!groupId || !editName.trim()) return;
    updateGroupMutation.mutate({
      organizationId,
      groupId,
      name: editName.trim(),
      icon: editIcon,
    });
  };

  const handleAssignRole = (roleSlug: string) => {
    if (!groupId) return;
    assignRoleMutation.mutate({
      organizationId,
      groupId,
      roleSlug,
    });
  };

  const handleRemoveRole = (roleSlug: string) => {
    if (!groupId) return;
    removeRoleMutation.mutate({
      organizationId,
      groupId,
      roleSlug,
    });
  };

  // アイコンコンポーネントを取得
  const IconComponent = department?.icon
    ? (LucideIcons[
        department.icon as keyof typeof LucideIcons
      ] as React.ComponentType<{
        className?: string;
        style?: React.CSSProperties;
      }>)
    : null;

  // メンバーがいるかどうか
  const hasMembers = department?.members && department.members.length > 0;

  // グループロール関連
  const groupRoles = groupRolesData ?? [];
  const hasRoles = groupRoles.length > 0;
  const currentRoleSlugs = groupRoles.map((r) => r.roleSlug);

  // 組織のロール一覧（AssignRoleDialog用）
  const availableRoles = useMemo(() => {
    if (!organizationRolesData) return [];
    return organizationRolesData.map((role) => ({
      slug: role.slug,
      name: role.name,
      description: role.description,
      defaultRead: role.defaultRead,
      defaultWrite: role.defaultWrite,
      defaultExecute: role.defaultExecute,
    }));
  }, [organizationRolesData]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[350px] flex-col overflow-y-auto sm:w-[400px]"
      >
        {department ? (
          <>
            {/* ヘッダー部分 */}
            <SheetHeader className="pb-4">
              {isEditing ? (
                // 編集モード
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IconPicker
                      selectedIcon={editIcon}
                      onIconChange={setEditIcon}
                    />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="部署名"
                      maxLength={100}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={updateGroupMutation.isPending}
                    >
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={
                        !editName.trim() || updateGroupMutation.isPending
                      }
                    >
                      {updateGroupMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </div>
              ) : (
                // 表示モード
                <div className="flex items-center gap-4">
                  {IconComponent ? (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${department.color}15` }}
                    >
                      <IconComponent
                        className="h-6 w-6"
                        style={{ color: department.color }}
                      />
                    </div>
                  ) : (
                    <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl">
                      <LucideIcons.Users className="text-muted-foreground h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <SheetTitle className="text-lg">
                      {department.name}
                    </SheetTitle>
                    <SheetDescription className="mt-0.5">
                      {department.memberCount > 0
                        ? `${department.memberCount}人のメンバー`
                        : "メンバー未登録"}
                    </SheetDescription>
                  </div>
                  {canEdit && !department.isRoot && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleStartEdit}
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                    >
                      <LucideIcons.Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </SheetHeader>

            <Separator />

            <div className="flex-1 space-y-6 px-6 py-6">
              {/* メンバーがいない場合の導線 */}
              {!hasMembers && canEdit && !department.isRoot && (
                <section className="bg-muted/50 rounded-xl border border-dashed p-5">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="bg-background flex h-12 w-12 items-center justify-center rounded-full shadow-sm">
                      <LucideIcons.UserPlus className="text-muted-foreground h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        まずメンバーを追加しましょう
                      </p>
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        部門長の設定にはメンバーが必要です
                      </p>
                    </div>
                    <AddMembersDialog
                      organizationMembers={organizationMembers}
                      currentGroupMemberIds={[]}
                      onAddMembers={handleAddMembers}
                      isAdding={addMembersMutation.isPending}
                      isOpen={isAddMembersDialogOpen}
                      onOpenChange={setIsAddMembersDialogOpen}
                    />
                  </div>
                </section>
              )}

              {/* メンバー一覧（メンバーがいる場合のみ表示） */}
              {hasMembers && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <LucideIcons.Users className="h-4 w-4" />
                      メンバー一覧
                    </h3>
                    <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                      {department.members.length}人
                    </span>
                  </div>

                  {canEdit && !department.isRoot && (
                    <AddMembersDialog
                      organizationMembers={organizationMembers}
                      currentGroupMemberIds={department.members.map(
                        (m) => m.id,
                      )}
                      onAddMembers={handleAddMembers}
                      isAdding={addMembersMutation.isPending}
                      isOpen={isAddMembersDialogOpen}
                      onOpenChange={setIsAddMembersDialogOpen}
                    />
                  )}

                  <MemberList
                    members={department.members}
                    leaderId={department.leader.id}
                    canEdit={canEdit && !department.isRoot}
                    onRemoveMember={handleRemoveMember}
                    onLeaderChange={handleLeaderChange}
                    isRemoving={removeMemberMutation.isPending}
                    isUpdatingLeader={updateLeaderMutation.isPending}
                  />
                </section>
              )}

              {/* 閲覧のみ + メンバーなしの場合 */}
              {!hasMembers && (!canEdit || department.isRoot) && (
                <section className="bg-muted/30 rounded-xl p-8">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <LucideIcons.Users className="text-muted-foreground h-10 w-10" />
                    <p className="text-muted-foreground text-sm">
                      このグループにはまだメンバーがいません
                    </p>
                  </div>
                </section>
              )}

              {/* ロールセクション */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <LucideIcons.Shield className="h-4 w-4" />
                    割り当て済みロール
                  </h3>
                  {hasRoles && (
                    <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                      {groupRoles.length}件
                    </span>
                  )}
                </div>

                {/* ロール一覧 */}
                {hasRoles ? (
                  <GroupRoleList
                    roles={groupRoles}
                    canEdit={canEdit}
                    onRemoveRole={handleRemoveRole}
                    isRemoving={removeRoleMutation.isPending}
                  />
                ) : (
                  <div className="bg-muted/30 rounded-xl p-6">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <LucideIcons.Shield className="text-muted-foreground h-8 w-8" />
                      <p className="text-muted-foreground text-sm">
                        ロールが割り当てられていません
                      </p>
                    </div>
                  </div>
                )}

                {/* ロール追加ボタン */}
                {canEdit && (
                  <AssignRoleDialog
                    availableRoles={availableRoles}
                    currentRoleSlugs={currentRoleSlugs}
                    onAssignRole={handleAssignRole}
                    isAssigning={assignRoleMutation.isPending}
                    isOpen={isAssignRoleDialogOpen}
                    onOpenChange={setIsAssignRoleDialogOpen}
                  />
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
              <LucideIcons.MousePointerClick className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">グループを選択</p>
              <p className="text-muted-foreground mt-1 text-sm">
                組織図のノードをクリックしてください
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/**
 * イニシャルを生成
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return name.slice(0, 2).toUpperCase();
};
