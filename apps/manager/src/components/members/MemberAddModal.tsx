"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, X, Search, User } from "lucide-react";

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

interface MemberAddModalProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
}

export const MemberAddModal = ({
  organizationId,
  isOpen,
  onClose,
  onMemberAdded,
}: MemberAddModalProps) => {
  const [userIdentifier, setUserIdentifier] = useState(""); // email or user ID
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [step, setStep] = useState<"search" | "configure">("search");
  const [foundUser, setFoundUser] = useState<any>(null);

  // ユーザー検索（仮想的 - 実際にはユーザー検索APIが必要）
  const searchUserMutation = trpc.user.findByEmail.useMutation({
    onSuccess: (user) => {
      if (user) {
        setFoundUser(user);
        setStep("configure");
      } else {
        toast.error("ユーザーが見つかりません", {
          description: "指定されたメールアドレスのユーザーは存在しません",
        });
      }
    },
    onError: (error) => {
      toast.error("ユーザー検索に失敗しました", {
        description: error.message,
      });
    },
  });

  // 組織のロール一覧取得（仮想的 - 実際にはorganizationRoleルーターが必要）
  const { data: roles } = trpc.organizationRole?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // 組織のグループ一覧取得（仮想的 - 実際にはorganizationGroupルーターが必要）
  const { data: groups } = trpc.organizationGroup?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // メンバー追加
  const addMemberMutation = trpc.organizationMember.add.useMutation({
    onSuccess: () => {
      onMemberAdded();
      handleClose();
      toast.success("メンバーを追加しました");
    },
    onError: (error) => {
      toast.error("メンバーの追加に失敗しました", {
        description: error.message,
      });
    },
  });

  const handleClose = () => {
    setUserIdentifier("");
    setIsAdmin(false);
    setSelectedRoles([]);
    setSelectedGroups([]);
    setStep("search");
    setFoundUser(null);
    onClose();
  };

  const handleSearchUser = () => {
    if (!userIdentifier.trim()) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    // 簡単なメールバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userIdentifier)) {
      toast.error("正しいメールアドレスを入力してください");
      return;
    }

    searchUserMutation.mutate({ email: userIdentifier });
  };

  const handleAddMember = () => {
    if (!foundUser) return;

    addMemberMutation.mutate({
      organizationId,
      userId: foundUser.id,
      isAdmin,
      roleIds: selectedRoles,
      groupIds: selectedGroups,
    });
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

  const handleBack = () => {
    setStep("search");
    setFoundUser(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>メンバーを追加</DialogTitle>
          <DialogDescription>
            {step === "search" ? 
              "追加するユーザーのメールアドレスを入力してください" :
              "ユーザーの設定を行ってください"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "search" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <div className="flex space-x-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={userIdentifier}
                    onChange={(e) => setUserIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                  />
                  <Button 
                    onClick={handleSearchUser}
                    disabled={searchUserMutation.isPending}
                  >
                    {searchUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === "configure" && foundUser && (
            <div className="space-y-6">
              {/* ユーザー情報表示 */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{foundUser.name || "名前未設定"}</div>
                      <div className="text-sm text-muted-foreground">{foundUser.email}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 管理者権限設定 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>管理者権限</Label>
                  <div className="text-sm text-muted-foreground">
                    組織全体を管理する権限を付与します
                  </div>
                </div>
                <Switch
                  checked={isAdmin}
                  onCheckedChange={setIsAdmin}
                />
              </div>

              {/* ロール選択 */}
              {roles && roles.length > 0 && (
                <div className="space-y-3">
                  <Label>ロール</Label>
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
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "search" ? (
            <Button onClick={handleClose} variant="outline">
              キャンセル
            </Button>
          ) : (
            <>
              <Button onClick={handleBack} variant="outline">
                戻る
              </Button>
              <Button 
                onClick={handleAddMember}
                disabled={addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                追加
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};