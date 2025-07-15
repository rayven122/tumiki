// "use client";

// import { useState } from "react";
// import { useParams } from "next/navigation";
// import { api } from "@/trpc/react";
// import { usePermission } from "@/hooks/usePermission";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Plus, Pencil, Trash2, Crown } from "lucide-react";
// import { RESOURCE_TYPES } from "@/lib/permissions";
// import { RoleCreateForm } from "@/components/roles/RoleCreateForm";
// import { RoleEditForm } from "@/components/roles/RoleEditForm";

// const RolesPage = () => {
//   const params = useParams();
//   const organizationId = params.id as string;

//   const [showCreateForm, setShowCreateForm] = useState(false);
//   const [editingRole, setEditingRole] = useState<string | null>(null);

//   const {
//     data: roles,
//     isLoading,
//     refetch,
//   } = api.organizationRole.getByOrganization.useQuery({
//     organizationId,
//   });

//   const { canManage, canCreate, canDelete } = usePermission(organizationId);

//   const deleteRoleMutation = api.organizationRole.delete.useMutation({
//     onSuccess: () => {
//       void refetch();
//     },
//   });

//   const setDefaultMutation = api.organizationRole.setDefault.useMutation({
//     onSuccess: () => {
//       void refetch();
//     },
//   });

//   const handleDeleteRole = async (roleId: string) => {
//     if (confirm("このロールを削除してもよろしいですか？")) {
//       await deleteRoleMutation.mutateAsync({ id: roleId });
//     }
//   };

//   const handleSetDefault = async (roleId: string) => {
//     await setDefaultMutation.mutateAsync({ roleId, organizationId });
//   };

//   const canManageRoles = canManage(RESOURCE_TYPES.ROLE);
//   const canCreateRoles = canCreate(RESOURCE_TYPES.ROLE);
//   const canDeleteRoles = canDelete(RESOURCE_TYPES.ROLE);

//   if (isLoading) {
//     return <div>ロールを読み込み中...</div>;
//   }

//   return (
//     <div className="container mx-auto py-6">
//       <div className="mb-6 flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold">ロール管理</h1>
//           <p className="text-muted-foreground">
//             組織のロールと権限を管理します
//           </p>
//         </div>
//         {canCreateRoles && (
//           <Button onClick={() => setShowCreateForm(true)}>
//             <Plus className="mr-2 h-4 w-4" />
//             新しいロール
//           </Button>
//         )}
//       </div>

//       {showCreateForm && (
//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle>新しいロールを作成</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <RoleCreateForm
//               organizationId={organizationId}
//               onSuccess={() => {
//                 setShowCreateForm(false);
//                 void refetch();
//               }}
//               onCancel={() => setShowCreateForm(false)}
//             />
//           </CardContent>
//         </Card>
//       )}

//       <div className="grid gap-4">
//         {roles?.map((role) => (
//           <Card key={role.id}>
//             <CardHeader>
//               <div className="flex items-start justify-between">
//                 <div className="flex items-center gap-2">
//                   <CardTitle className="flex items-center gap-2">
//                     {role.name}
//                     {role.isDefault && (
//                       <Badge
//                         variant="default"
//                         className="flex items-center gap-1"
//                       >
//                         <Crown className="h-3 w-3" />
//                         デフォルト
//                       </Badge>
//                     )}
//                   </CardTitle>
//                 </div>
//                 <div className="flex gap-2">
//                   {canManageRoles && !role.isDefault && (
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => handleSetDefault(role.id)}
//                     >
//                       <Crown className="mr-1 h-4 w-4" />
//                       デフォルトに設定
//                     </Button>
//                   )}
//                   {canManageRoles && (
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => setEditingRole(role.id)}
//                     >
//                       <Pencil className="h-4 w-4" />
//                     </Button>
//                   )}
//                   {canDeleteRoles &&
//                     !role.isDefault &&
//                     role._count.members === 0 &&
//                     role._count.groups === 0 && (
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handleDeleteRole(role.id)}
//                       >
//                         <Trash2 className="h-4 w-4" />
//                       </Button>
//                     )}
//                 </div>
//               </div>
//               {role.description && (
//                 <CardDescription>{role.description}</CardDescription>
//               )}
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 <div className="text-muted-foreground flex gap-4 text-sm">
//                   <span>メンバー: {role._count.members}</span>
//                   <span>グループ: {role._count.groups}</span>
//                   <span>権限: {role.permissions.length}</span>
//                 </div>

//                 {editingRole === role.id && (
//                   <div className="border-t pt-4">
//                     <RoleEditForm
//                       role={role}
//                       onSuccess={() => {
//                         setEditingRole(null);
//                         void refetch();
//                       }}
//                       onCancel={() => setEditingRole(null)}
//                     />
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       {roles?.length === 0 && (
//         <Card>
//           <CardContent className="flex flex-col items-center justify-center py-12">
//             <h3 className="mb-2 text-lg font-semibold">ロールがありません</h3>
//             <p className="text-muted-foreground mb-4">
//               まだロールが作成されていません。
//             </p>
//             {canCreateRoles && (
//               <Button onClick={() => setShowCreateForm(true)}>
//                 最初のロールを作成
//               </Button>
//             )}
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default RolesPage;
