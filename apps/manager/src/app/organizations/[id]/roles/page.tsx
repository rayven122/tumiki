"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ResourceType } from "@tumiki/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RoleCreateForm } from "@/components/roles/RoleCreateForm";
import { RoleEditForm } from "@/components/roles/RoleEditForm";
import { RoleAssignment } from "@/components/roles/RoleAssignment";
import { PermissionMatrix } from "@/components/roles/PermissionMatrix";
import { usePermission } from "@/hooks/usePermission";
import { api } from "@/trpc/react";
import { getResourceTypeDisplayName, getActionDisplayName } from "@/lib/permissions";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Settings, 
  Shield,
  Eye,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function RolesPage() {
  const params = useParams();
  const organizationId = params.id as string;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "default" | "custom">("all");
  const [activeTab, setActiveTab] = useState("list");

  // 組織のロール一覧を取得
  const { 
    data: roles, 
    isLoading, 
    refetch: refetchRoles 
  } = api.organizationRole.getByOrganization.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
    }
  );

  // 権限チェック
  const { canCreate, canUpdate, canDelete, canManage } = usePermission(organizationId);
  const canCreateRole = canCreate(ResourceType.ROLE);
  const canUpdateRole = canUpdate(ResourceType.ROLE);
  const canDeleteRole = canDelete(ResourceType.ROLE);
  const canManageRole = canManage(ResourceType.ROLE);

  // ロール削除のmutation
  const deleteRoleMutation = api.organizationRole.delete.useMutation({
    onSuccess: () => {
      toast.success("ロールを削除しました");
      refetchRoles();
      setDeletingRole(null);
    },
    onError: (error) => {
      toast.error(`ロールの削除に失敗しました: ${error.message}`);
    },
  });

  // デフォルトロール設定のmutation
  const setDefaultMutation = api.organizationRole.setDefault.useMutation({
    onSuccess: () => {
      toast.success("デフォルトロールを設定しました");
      refetchRoles();
    },
    onError: (error) => {
      toast.error(`デフォルトロールの設定に失敗しました: ${error.message}`);
    },
  });

  // フィルタされたロール一覧
  const filteredRoles = roles?.filter((role) => {
    const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         role.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || 
                         (filterType === "default" && role.isDefault) ||
                         (filterType === "custom" && !role.isDefault);

    return matchesSearch && matchesFilter;
  }) || [];

  const handleDeleteRole = (roleId: string) => {
    deleteRoleMutation.mutate({ id: roleId });
  };

  const handleSetDefault = (roleId: string) => {
    setDefaultMutation.mutate({ roleId, organizationId });
  };

  const handleFormSuccess = () => {
    refetchRoles();
    setShowCreateForm(false);
    setEditingRole(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-lg">ロール情報を読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            ロール・権限管理
          </h1>
          <p className="text-muted-foreground mt-2">
            組織内のロールを管理し、メンバーやグループに権限を割り当てます
          </p>
        </div>
        {canCreateRole && (
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                新しいロール
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新しいロールを作成</DialogTitle>
                <DialogDescription>
                  組織内で使用する新しいロールを作成し、権限を設定できます
                </DialogDescription>
              </DialogHeader>
              <RoleCreateForm
                organizationId={organizationId}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ロール数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">デフォルトロール</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.filter(role => role.isDefault).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブメンバー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.reduce((total, role) => total + role._count.members, 0) || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブグループ</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.reduce((total, role) => total + role._count.groups, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            ロール一覧
          </TabsTrigger>
          <TabsTrigger value="assignment" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            ロール割り当て
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* 検索とフィルター */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ロール名や説明で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのロール</SelectItem>
                <SelectItem value="default">デフォルトロール</SelectItem>
                <SelectItem value="custom">カスタムロール</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ロール一覧 */}
          <div className="grid gap-4">
            {filteredRoles.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">ロールが見つかりません</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || filterType !== "all" 
                        ? "検索条件を変更してください" 
                        : "最初のロールを作成してください"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredRoles.map((role) => (
                <Card key={role.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {role.name}
                          {role.isDefault && (
                            <Badge variant="secondary">
                              <Crown className="h-3 w-3 mr-1" />
                              デフォルト
                            </Badge>
                          )}
                        </CardTitle>
                        {role.description && (
                          <CardDescription>{role.description}</CardDescription>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingRole(role.id)}
                            disabled={!canUpdateRole}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            詳細を表示
                          </DropdownMenuItem>
                          {canUpdateRole && (
                            <DropdownMenuItem onClick={() => setEditingRole(role.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              編集
                            </DropdownMenuItem>
                          )}
                          {canManageRole && !role.isDefault && (
                            <DropdownMenuItem onClick={() => handleSetDefault(role.id)}>
                              <Crown className="h-4 w-4 mr-2" />
                              デフォルトに設定
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canDeleteRole && !role.isDefault && (
                            <DropdownMenuItem
                              onClick={() => setDeletingRole(role.id)}
                              className="text-destructive"
                              disabled={role._count.members > 0 || role._count.groups > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              削除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 使用状況 */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">メンバー</div>
                          <div className="font-medium">{role._count.members}人</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">グループ</div>
                          <div className="font-medium">{role._count.groups}個</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">権限</div>
                          <div className="font-medium">{role.permissions.length}個</div>
                        </div>
                      </div>

                      {/* 権限の概要 */}
                      {role.permissions.length > 0 && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">権限</div>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.slice(0, 6).map((perm, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {getResourceTypeDisplayName(perm.resourceType)} - {getActionDisplayName(perm.action)}
                              </Badge>
                            ))}
                            {role.permissions.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.permissions.length - 6}個
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="assignment">
          <RoleAssignment
            organizationId={organizationId}
            onRoleAssigned={refetchRoles}
          />
        </TabsContent>
      </Tabs>

      {/* ロール編集ダイアログ */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ロールの編集</DialogTitle>
            <DialogDescription>
              ロールの名前、説明、権限設定を変更できます
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <RoleEditForm
              roleId={editingRole}
              organizationId={organizationId}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingRole(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ロール削除確認ダイアログ */}
      <AlertDialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ロールを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。ロールを削除すると、関連する権限設定も全て削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRole && handleDeleteRole(deletingRole)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}