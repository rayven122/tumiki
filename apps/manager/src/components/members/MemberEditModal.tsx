"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Save, X, User, Crown } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface Member {
  id: string;
  userId: string;
  isAdmin: boolean;
  user: User;
  roles: Role[];
  groups: Group[];
  createdAt: Date;
  updatedAt: Date;
}

interface MemberEditModalProps {
  organizationId: string;
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated: () => void;
}

export const MemberEditModal = ({
  organizationId,
  member,
  isOpen,
  onClose,
  onMemberUpdated,
}: MemberEditModalProps) => {
  const [isAdmin, setIsAdmin] = useState(member.isAdmin);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    member.roles.map(role => role.id)
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    member.groups.map(group => group.id)
  );

  // 組織のロール一覧取得（仮想的 - 実際にはorganizationRoleルーターが必要）
  const { data: roles } = trpc.organizationRole?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // 組織のグループ一覧取得（仮想的 - 実際にはorganizationGroupルーターが必要）
  const { data: groups } = trpc.organizationGroup?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // 管理者権限更新
  const toggleAdminMutation = trpc.organizationMember.toggleAdmin.useMutation({
    onSuccess: () => {
      onMemberUpdated();
      toast.success("管理者権限を更新しました");
    },
    onError: (error) => {
      toast.error("管理者権限の更新に失敗しました", {
        description: error.message,
      });
      setIsAdmin(!isAdmin); // 元に戻す
    },
  });

  // ロール・グループ更新
  const updateRoleMutation = trpc.organizationMember.updateRole.useMutation({
    onSuccess: () => {
      onMemberUpdated();
      onClose();
      toast.success("メンバー情報を更新しました");
    },
    onError: (error) => {
      toast.error("メンバー情報の更新に失敗しました", {
        description: error.message,
      });
    },
  });

  // memberが変更されたときに状態をリセット
  useEffect(() => {
    setIsAdmin(member.isAdmin);
    setSelectedRoles(member.roles.map(role => role.id));
    setSelectedGroups(member.groups.map(group => group.id));
  }, [member]);

  const handleToggleAdmin = () => {
    const newAdminStatus = !isAdmin;
    setIsAdmin(newAdminStatus);
    
    toggleAdminMutation.mutate({
      organizationId,
      memberId: member.id,
    });
  };

  const handleSave = () => {
    const roleChanged = 
      selectedRoles.length !== member.roles.length ||
      selectedRoles.some(id => !member.roles.find(role => role.id === id));
    
    const groupChanged = 
      selectedGroups.length !== member.groups.length ||
      selectedGroups.some(id => !member.groups.find(group => group.id === id));

    if (!roleChanged && !groupChanged) {
      onClose();
      return;
    }

    updateRoleMutation.mutate({
      organizationId,
      memberId: member.id,
      roleIds: selectedRoles,
      groupIds: selectedGroups,
    });
  };

  const handleClose = () => {
    // 変更をリセット
    setIsAdmin(member.isAdmin);
    setSelectedRoles(member.roles.map(role => role.id));
    setSelectedGroups(member.groups.map(group => group.id));
    onClose();
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getUserInitials = (user: User) => {
    const name = user.name || user.email || "U";
    return name.slice(0, 2).toUpperCase();
  };

  // 変更があるかチェック
  const hasChanges = 
    isAdmin !== member.isAdmin ||
    selectedRoles.length !== member.roles.length ||
    selectedRoles.some(id => !member.roles.find(role => role.id === id)) ||
    selectedGroups.length !== member.groups.length ||
    selectedGroups.some(id => !member.groups.find(group => group.id === id));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>メンバー編集</DialogTitle>
          <DialogDescription>
            メンバーの権限、ロール、グループを編集できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ユーザー情報表示 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.user.image || undefined} />
                  <AvatarFallback className="text-sm">
                    {getUserInitials(member.user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{member.user.name || "名前未設定"}</div>
                  <div className="text-sm text-muted-foreground">{member.user.email}</div>
                </div>
                {member.isAdmin && (
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                    <Crown className="mr-1 h-3 w-3" />
                    管理者
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 管理者権限設定 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>管理者権限</Label>
              <div className="text-sm text-muted-foreground">
                組織全体を管理する権限を付与します
              </div>
            </div>
            <Switch
              checked={isAdmin}
              onCheckedChange={handleToggleAdmin}
              disabled={toggleAdminMutation.isPending}
            />
          </div>

          {/* ロール選択 */}
          {roles && roles.length > 0 && (
            <div className="space-y-3">
              <Label>ロール</Label>
              <div className="text-sm text-muted-foreground mb-2">
                現在: {member.roles.length > 0 ? member.roles.map(r => r.name).join(", ") : "なし"}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                      selectedRoles.includes(role.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleRole(role.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground">
                            {role.description}
                          </div>
                        )}
                      </div>
                      {selectedRoles.includes(role.id) && (
                        <Badge variant="secondary" size="sm">選択済み</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedRoles.map((roleId) => {
                    const role = roles.find(r => r.id === roleId);
                    return role ? (
                      <Badge key={roleId} variant="secondary">
                        {role.name}
                        <X 
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRole(roleId);
                          }}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* グループ選択 */}
          {groups && groups.length > 0 && (
            <div className="space-y-3">
              <Label>グループ</Label>
              <div className="text-sm text-muted-foreground mb-2">
                現在: {member.groups.length > 0 ? member.groups.map(g => g.name).join(", ") : "なし"}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                      selectedGroups.includes(group.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{group.name}</div>
                        {group.description && (
                          <div className="text-xs text-muted-foreground">
                            {group.description}
                          </div>
                        )}
                      </div>
                      {selectedGroups.includes(group.id) && (
                        <Badge variant="outline" size="sm">選択済み</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedGroups.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedGroups.map((groupId) => {
                    const group = groups.find(g => g.id === groupId);
                    return group ? (
                      <Badge key={groupId} variant="outline">
                        {group.name}
                        <X 
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroup(groupId);
                          }}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* 参加日表示 */}
          <div className="text-sm text-muted-foreground">
            参加日: {new Date(member.createdAt).toLocaleDateString("ja-JP")}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            キャンセル
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || updateRoleMutation.isPending}
          >
            {updateRoleMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};