"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PermissionMatrix } from "./PermissionMatrix";
import { api } from "@/trpc/react";
import { type Permission } from "@/lib/permissions";
import { Edit, Save, Loader2, Crown } from "lucide-react";

// フォームスキーマ
const editRoleSchema = z.object({
  name: z.string().min(1, "ロール名は必須です").max(100, "ロール名は100文字以内で入力してください"),
  description: z.string().optional(),
});

type EditRoleFormData = z.infer<typeof editRoleSchema>;

interface RoleEditFormProps {
  roleId: string;
  organizationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RoleEditForm = ({ roleId, organizationId, onSuccess, onCancel }: RoleEditFormProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  const form = useForm<EditRoleFormData>({
    resolver: zodResolver(editRoleSchema),
  });

  // 組織のロール一覧を取得（編集対象のロールを含む）
  const { data: roles, isLoading } = api.organizationRole.getByOrganization.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
    }
  );

  // 編集対象のロールを取得
  const targetRole = roles?.find(role => role.id === roleId);

  // 初期データの設定
  useEffect(() => {
    if (targetRole && !initialData) {
      const rolePermissions = targetRole.permissions.map(perm => ({
        resourceType: perm.resourceType,
        action: perm.action,
      }));

      form.reset({
        name: targetRole.name,
        description: targetRole.description || "",
      });

      setPermissions(rolePermissions);
      setInitialData(targetRole);
    }
  }, [targetRole, form, initialData]);

  // ロール更新のmutation
  const updateRoleMutation = api.organizationRole.update.useMutation({
    onSuccess: () => {
      toast.success("ロール情報を更新しました");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`ロール情報の更新に失敗しました: ${error.message}`);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // 権限更新のmutation
  const updatePermissionsMutation = api.organizationRole.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("権限設定を更新しました");
    },
    onError: (error) => {
      toast.error(`権限設定の更新に失敗しました: ${error.message}`);
    },
  });

  const onSubmit = async (data: EditRoleFormData) => {
    if (!targetRole) return;

    setIsSubmitting(true);

    try {
      // ロール基本情報の更新
      await updateRoleMutation.mutateAsync({
        id: roleId,
        name: data.name,
        description: data.description || undefined,
      });

      // 権限設定の更新
      await updatePermissionsMutation.mutateAsync({
        roleId: roleId,
        permissions: permissions,
      });

      onSuccess?.();
    } catch (error) {
      // エラーは各mutationで処理される
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
      });
      setPermissions(initialData.permissions.map((perm: any) => ({
        resourceType: perm.resourceType,
        action: perm.action,
      })));
    }
    onCancel?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">ロール情報を読み込み中...</span>
        </CardContent>
      </Card>
    );
  }

  if (!targetRole) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            ロールが見つかりません
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          ロールの編集
          {targetRole.isDefault && (
            <Badge variant="secondary" className="ml-2">
              <Crown className="h-3 w-3 mr-1" />
              デフォルト
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          ロールの名前、説明、権限設定を変更できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">基本情報</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ロール名 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例：開発者、マネージャー、読み取り専用"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      組織内で一意のロール名を入力してください
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="このロールの目的や責任について説明してください"
                        className="resize-none"
                        rows={3}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      ロールの目的や責任を説明することで、他のメンバーが理解しやすくなります
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ロール統計 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">ロール使用状況</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold">{targetRole._count.members}</div>
                  <div className="text-sm text-muted-foreground">直接割り当て</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold">{targetRole._count.groups}</div>
                  <div className="text-sm text-muted-foreground">グループ割り当て</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold">{targetRole.permissions.length}</div>
                  <div className="text-sm text-muted-foreground">権限数</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold">
                    {targetRole.isDefault ? "はい" : "いいえ"}
                  </div>
                  <div className="text-sm text-muted-foreground">デフォルト</div>
                </div>
              </div>
            </div>

            {/* 権限設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">権限設定</h3>
              <PermissionMatrix
                permissions={permissions}
                onChange={setPermissions}
                disabled={isSubmitting}
              />
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                変更を保存
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};