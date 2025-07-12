"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { Users, User, UserPlus, Crown, X, Loader2 } from "lucide-react";

interface RoleAssignmentProps {
  organizationId: string;
  onRoleAssigned?: () => void;
}

export const RoleAssignment = ({ organizationId, onRoleAssigned }: RoleAssignmentProps) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // 組織のロール一覧を取得
  const { data: roles, isLoading: rolesLoading } = api.organizationRole.getByOrganization.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
    }
  );

  // TODO: 組織のメンバー一覧を取得するAPIが必要
  // const { data: members, isLoading: membersLoading } = api.organization.getMembers.useQuery(
  //   { organizationId },
  //   {
  //     enabled: !!organizationId,
  //   }
  // );

  // TODO: 組織のグループ一覧を取得するAPIが必要
  // const { data: groups, isLoading: groupsLoading } = api.organization.getGroups.useQuery(
  //   { organizationId },
  //   {
  //     enabled: !!organizationId,
  //   }
  // );

  // ロール割り当てのmutation（仮実装）
  // const assignRoleMutation = api.organizationRole.assignToMember.useMutation({
  //   onSuccess: () => {
  //     toast.success("ロールを割り当てました");
  //     onRoleAssigned?.();
  //   },
  //   onError: (error) => {
  //     toast.error(`ロールの割り当てに失敗しました: ${error.message}`);
  //   },
  //   onSettled: () => {
  //     setIsAssigning(false);
  //   },
  // });

  // ロール解除のmutation（仮実装）
  // const unassignRoleMutation = api.organizationRole.unassignFromMember.useMutation({
  //   onSuccess: () => {
  //     toast.success("ロールを解除しました");
  //     onRoleAssigned?.();
  //   },
  //   onError: (error) => {
  //     toast.error(`ロールの解除に失敗しました: ${error.message}`);
  //   },
  // });

  const handleAssignRole = async (memberId: string, roleId: string) => {
    setIsAssigning(true);
    try {
      // assignRoleMutation.mutate({ memberId, roleId });
      // 仮実装: APIが実装されるまでの間の処理
      toast.info("ロール割り当て機能は実装中です");
    } catch (error) {
      toast.error("ロールの割り当てに失敗しました");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignRole = async (memberId: string, roleId: string) => {
    try {
      // unassignRoleMutation.mutate({ memberId, roleId });
      // 仮実装: APIが実装されるまでの間の処理
      toast.info("ロール解除機能は実装中です");
    } catch (error) {
      toast.error("ロールの解除に失敗しました");
    }
  };

  if (rolesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">ロール情報を読み込み中...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          ロール割り当て
        </CardTitle>
        <CardDescription>
          メンバーやグループにロールを割り当てて権限を管理できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              メンバー
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              グループ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">メンバーのロール割り当て</h3>
              
              {/* ロール選択 */}
              <div className="flex items-center space-x-2">
                <Select value={selectedRole || ""} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="ロールを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          {role.isDefault && <Crown className="h-3 w-3" />}
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRole(null)}
                  disabled={!selectedRole}
                >
                  クリア
                </Button>
              </div>

              {/* メンバー一覧（仮実装） */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  メンバー管理APIが実装されていないため、サンプルデータを表示しています
                </div>
                
                {/* サンプルメンバー */}
                {[
                  { id: "1", name: "田中太郎", email: "tanaka@example.com", roles: ["admin"] },
                  { id: "2", name: "佐藤花子", email: "sato@example.com", roles: ["editor"] },
                  { id: "3", name: "山田次郎", email: "yamada@example.com", roles: [] },
                ].map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* 現在のロール表示 */}
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map((roleName) => {
                          const role = roles?.find(r => r.name.toLowerCase() === roleName);
                          return (
                            <Badge key={roleName} variant="secondary" className="text-xs">
                              {role?.isDefault && <Crown className="h-3 w-3 mr-1" />}
                              {roleName}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-1 h-3 w-3 p-0"
                                onClick={() => role && handleUnassignRole(member.id, role.id)}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>

                      {/* ロール割り当てボタン */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectedRole && handleAssignRole(member.id, selectedRole)}
                        disabled={!selectedRole || isAssigning}
                      >
                        {isAssigning && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        割り当て
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">グループのロール割り当て</h3>
              
              {/* ロール選択 */}
              <div className="flex items-center space-x-2">
                <Select value={selectedRole || ""} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="ロールを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          {role.isDefault && <Crown className="h-3 w-3" />}
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRole(null)}
                  disabled={!selectedRole}
                >
                  クリア
                </Button>
              </div>

              {/* グループ一覧（仮実装） */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  グループ管理APIが実装されていないため、サンプルデータを表示しています
                </div>
                
                {/* サンプルグループ */}
                {[
                  { id: "1", name: "開発チーム", memberCount: 5, roles: ["developer"] },
                  { id: "2", name: "マネージメント", memberCount: 3, roles: ["admin"] },
                  { id: "3", name: "デザインチーム", memberCount: 4, roles: [] },
                ].map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{group.name}</div>
                        <div className="text-sm text-muted-foreground">{group.memberCount}人</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* 現在のロール表示 */}
                      <div className="flex flex-wrap gap-1">
                        {group.roles.map((roleName) => {
                          const role = roles?.find(r => r.name.toLowerCase() === roleName);
                          return (
                            <Badge key={roleName} variant="secondary" className="text-xs">
                              {role?.isDefault && <Crown className="h-3 w-3 mr-1" />}
                              {roleName}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-1 h-3 w-3 p-0"
                                onClick={() => role && handleUnassignRole(group.id, role.id)}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>

                      {/* ロール割り当てボタン */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectedRole && handleAssignRole(group.id, selectedRole)}
                        disabled={!selectedRole || isAssigning}
                      >
                        {isAssigning && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        割り当て
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};