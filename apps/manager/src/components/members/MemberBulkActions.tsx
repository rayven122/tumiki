"use client";

import { useState } from "react";
import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  ChevronDown, 
  Trash2, 
  Users, 
  Shield, 
  ShieldOff,
  UserCheck,
  UserX,
  Loader2,
  X
} from "lucide-react";

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

interface MemberBulkActionsProps {
  organizationId: string;
  selectedMembers: string[];
  onCompleted: () => void;
}

type BulkAction = "DELETE" | "UPDATE_ROLES" | "UPDATE_GROUPS" | "UPDATE_ADMIN";

export const MemberBulkActions = ({
  organizationId,
  selectedMembers,
  onCompleted,
}: MemberBulkActionsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<BulkAction | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // 組織のロール一覧取得（仮想的 - 実際にはorganizationRoleルーターが必要）
  const { data: roles } = trpc.organizationRole?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // 組織のグループ一覧取得（仮想的 - 実際にはorganizationGroupルーターが必要）
  const { data: groups } = trpc.organizationGroup?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // 一括操作
  const bulkUpdateMutation = trpc.organizationMember.bulkUpdate.useMutation({
    onSuccess: (result) => {
      onCompleted();
      setIsDialogOpen(false);
      resetState();
      toast.success(`${result.updatedCount} 人のメンバーを更新しました`);
    },
    onError: (error) => {
      toast.error("一括操作に失敗しました", {
        description: error.message,
      });
    },
  });

  const resetState = () => {
    setCurrentAction(null);
    setSelectedRoles([]);
    setSelectedGroups([]);
    setIsAdmin(false);
  };

  const handleActionSelect = (action: BulkAction) => {
    setCurrentAction(action);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetState();
  };

  const handleConfirm = () => {
    if (!currentAction) return;

    let mutationData: any = {
      organizationId,
      memberIds: selectedMembers,
      action: currentAction,
    };

    switch (currentAction) {
      case "UPDATE_ROLES":
        mutationData.roleIds = selectedRoles;
        break;
      case "UPDATE_GROUPS":
        mutationData.groupIds = selectedGroups;
        break;
      case "UPDATE_ADMIN":
        mutationData.isAdmin = isAdmin;
        break;
    }

    bulkUpdateMutation.mutate(mutationData);
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

  const getDialogTitle = () => {
    const count = selectedMembers.length;
    switch (currentAction) {
      case "DELETE":
        return `${count} 人のメンバーを削除`;
      case "UPDATE_ROLES":
        return `${count} 人のロールを更新`;
      case "UPDATE_GROUPS":
        return `${count} 人のグループを更新`;
      case "UPDATE_ADMIN":
        return `${count} 人の管理者権限を更新`;
      default:
        return "一括操作";
    }
  };

  const getDialogDescription = () => {
    switch (currentAction) {
      case "DELETE":
        return "選択されたメンバーを組織から削除します。この操作は元に戻せません。";
      case "UPDATE_ROLES":
        return "選択されたメンバーのロールを一括で変更します。現在のロールは置き換えられます。";
      case "UPDATE_GROUPS":
        return "選択されたメンバーのグループを一括で変更します。現在のグループは置き換えられます。";
      case "UPDATE_ADMIN":
        return "選択されたメンバーの管理者権限を一括で変更します。";
      default:
        return "";
    }
  };

  const canConfirm = () => {
    switch (currentAction) {
      case "DELETE":
        return true;
      case "UPDATE_ROLES":
        return selectedRoles.length > 0;
      case "UPDATE_GROUPS":
        return selectedGroups.length > 0;
      case "UPDATE_ADMIN":
        return true;
      default:
        return false;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">
            {selectedMembers.length} 人選択中
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              一括操作
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleActionSelect("UPDATE_ROLES")}>
              <UserCheck className="mr-2 h-4 w-4" />
              ロールを変更
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionSelect("UPDATE_GROUPS")}>
              <Users className="mr-2 h-4 w-4" />
              グループを変更
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleActionSelect("UPDATE_ADMIN")}>
              <Shield className="mr-2 h-4 w-4" />
              管理者権限を変更
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleActionSelect("DELETE")}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              組織から削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 一括操作確認ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {getDialogDescription()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentAction === "UPDATE_ROLES" && roles && roles.length > 0 && (
              <div className="space-y-3">
                <Label>新しいロール</Label>
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

            {currentAction === "UPDATE_GROUPS" && groups && groups.length > 0 && (
              <div className="space-y-3">
                <Label>新しいグループ</Label>
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

            {currentAction === "UPDATE_ADMIN" && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>管理者権限</Label>
                  <div className="text-sm text-muted-foreground">
                    選択されたメンバー全員に管理者権限を{isAdmin ? "付与" : "剥奪"}します
                  </div>
                </div>
                <Switch
                  checked={isAdmin}
                  onCheckedChange={setIsAdmin}
                />
              </div>
            )}

            {currentAction === "DELETE" && (
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="flex items-center space-x-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="font-medium">注意</span>
                </div>
                <p className="text-sm text-destructive mt-1">
                  この操作により、選択された {selectedMembers.length} 人のメンバーが組織から完全に削除されます。この操作は元に戻すことができません。
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleDialogClose} variant="outline">
              キャンセル
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!canConfirm() || bulkUpdateMutation.isPending}
              variant={currentAction === "DELETE" ? "destructive" : "default"}
            >
              {bulkUpdateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : currentAction === "DELETE" ? (
                <Trash2 className="mr-2 h-4 w-4" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              {currentAction === "DELETE" ? "削除する" : "更新する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};