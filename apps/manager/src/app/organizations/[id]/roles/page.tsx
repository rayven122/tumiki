"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Shield, Users, Settings } from "lucide-react";
import { RoleCreateForm } from "@/components/roles/RoleCreateForm";
import { RoleEditForm } from "@/components/roles/RoleEditForm";
import { RoleAssignment } from "@/components/roles/RoleAssignment";
import { PermissionMatrix } from "@/components/roles/PermissionMatrix";
import { usePermission } from "@/hooks/usePermission";
import type { RouterOutputs } from "@/trpc/react";

type RoleData = RouterOutputs["organizationRole"]["getByOrganization"][0];

export default function RolesPage() {
  const params = useParams();
  const organizationId = params.id as string;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // 権限チェック
  const { canRead, canCreate, canUpdate, canDelete, canManage } = usePermission(organizationId);
  
  // ロール一覧を取得
  const { 
    data: roles = [], 
    isLoading,
    refetch 
  } = trpc.organizationRole.getByOrganization.useQuery(
    { organizationId },
    { enabled: !!organizationId && canRead("ROLE") }
  );

  // ロール削除のmutation
  const deleteRoleMutation = trpc.organizationRole.delete.useMutation({
    onSuccess: () => {
      toast.success("ロールが削除されました");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "ロールの削除に失敗しました");
    },
  });

  // 検索フィルタリング
  const filteredRoles = useMemo(() => {
    return roles.filter(role =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  // ロール削除
  const handleDeleteRole = (role: RoleData) => {
    deleteRoleMutation.mutate({ id: role.id });
  };

  // ダイアログ操作
  const openEditDialog = (role: RoleData) => {
    setSelectedRole(role);
    setIsEditDialogOpen(true);
  };

  const openAssignDialog = (role: RoleData) => {
    setSelectedRole(role);
    setIsAssignDialogOpen(true);
  };

  const openViewDialog = (role: RoleData) => {
    setSelectedRole(role);
    setIsViewDialogOpen(true);
  };

  const closeDialogs = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsAssignDialogOpen(false);
    setIsViewDialogOpen(false);
    setSelectedRole(null);
    refetch();
  };

  // 権限チェック
  if (!canRead("ROLE")) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">アクセス権限がありません</h3>
              <p className="text-muted-foreground">ロール管理ページを表示する権限がありません。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-8">
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ロール管理</h1>
          <p className="text-muted-foreground">組織のロールと権限を管理します</p>
        </div>
        {canCreate("ROLE") && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新しいロール
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ロール作成</DialogTitle>
              </DialogHeader>
              <RoleCreateForm
                organizationId={organizationId}
                onSuccess={closeDialogs}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総ロール数</p>
                <p className="text-2xl font-bold">{roles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">デフォルトロール</p>
                <p className="text-2xl font-bold">{roles.filter(r => r.isDefault).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総メンバー数</p>
                <p className="text-2xl font-bold">
                  {roles.reduce((acc, role) => acc + role._count.members, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総グループ数</p>
                <p className="text-2xl font-bold">
                  {roles.reduce((acc, role) => acc + role._count.groups, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ロール一覧</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ロールを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ロール名</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>権限数</TableHead>
                <TableHead>メンバー</TableHead>
                <TableHead>グループ</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-center">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{role.name}</span>
                      {role.isDefault && (
                        <Badge variant="secondary">デフォルト</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {role.description || "説明なし"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role.permissions.length} 権限
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role._count.members} 人
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role._count.groups} グループ
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isDefault ? "default" : "secondary"}>
                      {role.isDefault ? "アクティブ" : "標準"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDialog(role)}>
                          <Shield className="h-4 w-4 mr-2" />
                          権限を表示
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAssignDialog(role)}>
                          <Users className="h-4 w-4 mr-2" />
                          割り当て管理
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canUpdate("ROLE") && (
                          <DropdownMenuItem onClick={() => openEditDialog(role)}>
                            <Edit className="h-4 w-4 mr-2" />
                            編集
                          </DropdownMenuItem>
                        )}
                        {canDelete("ROLE") && !role.isDefault && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                削除
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ロールを削除しますか？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  「{role.name}」ロールを削除します。この操作は取り消せません。
                                  このロールが割り当てられているメンバーやグループがある場合は削除できません。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRole(role)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  削除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRoles.length === 0 && (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">ロールが見つかりません</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "検索条件に一致するロールがありません" : "まだロールが作成されていません"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      {selectedRole && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>ロール編集</DialogTitle>
            </DialogHeader>
            <RoleEditForm
              role={selectedRole}
              organizationId={organizationId}
              onSuccess={closeDialogs}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 割り当て管理ダイアログ */}
      {selectedRole && (
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>ロール割り当て管理</DialogTitle>
            </DialogHeader>
            <RoleAssignment
              role={selectedRole}
              organizationId={organizationId}
              onAssignmentChange={refetch}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 権限表示ダイアログ */}
      {selectedRole && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>権限詳細: {selectedRole.name}</DialogTitle>
            </DialogHeader>
            <PermissionMatrix
              permissions={selectedRole.permissions.map(p => ({
                resourceType: p.resourceType,
                action: p.action,
              }))}
              onChange={() => {}} // 読み取り専用
              readonly={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}