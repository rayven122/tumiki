// "use client";

// import { useState } from "react";
// import { Button } from "@tumiki/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@tumiki/ui/dialog";
// import { Input } from "@tumiki/ui/input";
// import { Label } from "@tumiki/ui/label";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@tumiki/ui/card";
// import { Badge } from "@tumiki/ui/badge";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@tumiki/ui/alert-dialog";
// import { Copy, Trash2, Plus, Key } from "lucide-react";
// import { trpc } from "@/trpc/client";
// import { toast } from "sonner";

// interface ApiKeyManagerProps {
//   userMcpServerInstanceId: string;
// }

// export const ApiKeyManager = ({
//   userMcpServerInstanceId,
// }: ApiKeyManagerProps) => {
//   const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
//   const [newKeyName, setNewKeyName] = useState("");
//   const [generatedKey, setGeneratedKey] = useState<string | null>(null);

//   // tRPC クエリ・ミューテーション
//   const { data: apiKeys, refetch } = trpc.mcpApiKey.list.useQuery({
//     userMcpServerInstanceId,
//   });

//   const createApiKey = trpc.mcpApiKey.create.useMutation({
//     onSuccess: (data) => {
//       setGeneratedKey(data.secretKey);
//       refetch();
//       setNewKeyName("");
//       toast.success("APIキーが生成されました");

//       // 30秒後に自動非表示
//       setTimeout(() => setGeneratedKey(null), 30000);
//     },
//     onError: (error) => {
//       toast.error(`エラー: ${error.message}`);
//     },
//   });

//   const deleteApiKey = trpc.mcpApiKey.delete.useMutation({
//     onSuccess: () => {
//       refetch();
//       toast.success("APIキーを削除しました");
//     },
//     onError: (error) => {
//       toast.error(`削除エラー: ${error.message}`);
//     },
//   });

//   const handleCreateKey = () => {
//     if (!newKeyName.trim()) {
//       toast.error("APIキー名を入力してください");
//       return;
//     }

//     createApiKey.mutate({
//       name: newKeyName,
//       userMcpServerInstanceId,
//     });
//   };

//   const copyToClipboard = async (text: string, label: string) => {
//     try {
//       await navigator.clipboard.writeText(text);
//       toast.success(`${label}をクリップボードにコピーしました`);
//     } catch (error) {
//       toast.error("コピーに失敗しました");
//     }
//   };

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <Key className="h-5 w-5" />
//           APIキー管理
//         </CardTitle>
//         <CardDescription>
//           MCPサーバーへのアクセス用APIキーを管理します
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         {/* 新規生成されたAPIキー表示 */}
//         {generatedKey && (
//           <Card className="border-green-200 bg-green-50">
//             <CardHeader>
//               <CardTitle className="text-sm text-green-800">
//                 新しいAPIキーが生成されました
//               </CardTitle>
//               <CardDescription className="text-green-600">
//                 このキーは一度だけ表示されます。安全な場所に保存してください。
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="flex items-center gap-2">
//                 <Input
//                   value={generatedKey}
//                   readOnly
//                   className="font-mono text-sm"
//                 />
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => copyToClipboard(generatedKey, "APIキー")}
//                 >
//                   <Copy className="h-4 w-4" />
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* APIキー作成ボタン */}
//         <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
//           <DialogTrigger asChild>
//             <Button>
//               <Plus className="mr-2 h-4 w-4" />
//               新しいAPIキーを作成
//             </Button>
//           </DialogTrigger>
//           <DialogContent>
//             <DialogHeader>
//               <DialogTitle>新しいAPIキーを作成</DialogTitle>
//             </DialogHeader>
//             <div className="space-y-4">
//               <div>
//                 <Label htmlFor="keyName">APIキー名</Label>
//                 <Input
//                   id="keyName"
//                   placeholder="例: 本番環境用"
//                   value={newKeyName}
//                   onChange={(e) => setNewKeyName(e.target.value)}
//                 />
//               </div>
//               <div className="flex justify-end gap-2">
//                 <Button
//                   variant="outline"
//                   onClick={() => setIsCreateDialogOpen(false)}
//                 >
//                   キャンセル
//                 </Button>
//                 <Button
//                   onClick={handleCreateKey}
//                   disabled={createApiKey.isLoading}
//                 >
//                   {createApiKey.isLoading ? "作成中..." : "作成"}
//                 </Button>
//               </div>
//             </div>
//           </DialogContent>
//         </Dialog>

//         {/* APIキー一覧 */}
//         <div className="space-y-3">
//           {apiKeys?.map((key) => (
//             <Card key={key.id} className="p-4">
//               <div className="flex items-center justify-between">
//                 <div className="space-y-1">
//                   <div className="flex items-center gap-2">
//                     <h3 className="font-medium">{key.name}</h3>
//                     <Badge variant={key.isActive ? "default" : "secondary"}>
//                       {key.isActive ? "有効" : "無効"}
//                     </Badge>
//                     {key.expiresAt && new Date(key.expiresAt) < new Date() && (
//                       <Badge variant="destructive">期限切れ</Badge>
//                     )}
//                   </div>
//                   <div className="text-muted-foreground flex items-center gap-2 text-sm">
//                     <span>••••••••••••（暗号化済み）</span>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => copyToClipboard(key.id, "キーID")}
//                       title="キーIDをコピー"
//                     >
//                       <Copy className="h-3 w-3" />
//                     </Button>
//                   </div>
//                   {key.lastUsedAt && (
//                     <p className="text-muted-foreground text-xs">
//                       最終使用: {new Date(key.lastUsedAt).toLocaleString()}
//                     </p>
//                   )}
//                 </div>
//                 <AlertDialog>
//                   <AlertDialogTrigger asChild>
//                     <Button variant="ghost" size="sm">
//                       <Trash2 className="h-4 w-4" />
//                     </Button>
//                   </AlertDialogTrigger>
//                   <AlertDialogContent>
//                     <AlertDialogHeader>
//                       <AlertDialogTitle>
//                         APIキーを削除しますか？
//                       </AlertDialogTitle>
//                       <AlertDialogDescription>
//                         この操作は取り消せません。APIキー「{key.name}
//                         」を削除すると、
//                         このキーを使用しているアプリケーションはアクセスできなくなります。
//                       </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                       <AlertDialogCancel>キャンセル</AlertDialogCancel>
//                       <AlertDialogAction
//                         onClick={() => deleteApiKey.mutate({ id: key.id })}
//                         className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
//                       >
//                         削除
//                       </AlertDialogAction>
//                     </AlertDialogFooter>
//                   </AlertDialogContent>
//                 </AlertDialog>
//               </div>
//             </Card>
//           ))}
//         </div>

//         {apiKeys?.length === 0 && (
//           <div className="text-muted-foreground py-8 text-center">
//             APIキーがありません。新しいキーを作成してください。
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// };
