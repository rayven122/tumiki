"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { PermissionMatrix } from "./PermissionMatrix";
import type { Permission } from "@/lib/permissions";
import type { RouterOutputs } from "@/trpc/react";

const updateRoleSchema = z.object({
  name: z.string().min(1, "ロール名は必須です").max(100, "ロール名は100文字以内で入力してください"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

type UpdateRoleFormData = z.infer<typeof updateRoleSchema>;
type RoleData = RouterOutputs["organizationRole"]["getByOrganization"][0];

interface RoleEditFormProps {
  role: RoleData;
  organizationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RoleEditForm = ({ role, organizationId, onSuccess, onCancel }: RoleEditFormProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);

  const form = useForm<UpdateRoleFormData>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      name: role.name,
      description: role.description || "",
      isDefault: role.isDefault,
    },
  });

  // ロールの権限を初期化
  useEffect(() => {
    const initialPermissions: Permission[] = role.permissions.map(p => ({
      resourceType: p.resourceType,
      action: p.action,
    }));
    setPermissions(initialPermissions);
  }, [role.permissions]);

  const updateRoleMutation = trpc.organizationRole.update.useMutation({
    onSuccess: () => {
      toast.success("ロール情報が更新されました");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "ロール情報の更新に失敗しました");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const updatePermissionsMutation = trpc.organizationRole.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("権限設定が更新されました");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "権限設定の更新に失敗しました");
    },
    onSettled: () => {
      setIsPermissionsLoading(false);
    },
  });

  const setDefaultMutation = trpc.organizationRole.setDefault.useMutation({
    onSuccess: () => {
      toast.success("デフォルトロールが設定されました");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "デフォルトロール設定に失敗しました");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit = async (data: UpdateRoleFormData) => {
    setIsLoading(true);
    
    // デフォルトロールの設定が変更された場合は専用のAPIを呼ぶ
    if (data.isDefault && !role.isDefault) {
      setDefaultMutation.mutate({
        roleId: role.id,
        organizationId,
      });
      return;
    }
    
    updateRoleMutation.mutate({
      id: role.id,
      name: data.name !== role.name ? data.name : undefined,
      description: data.description !== (role.description || "") ? data.description : undefined,
      isDefault: data.isDefault !== role.isDefault ? data.isDefault : undefined,
    });
  };

  const handleUpdatePermissions = () => {
    setIsPermissionsLoading(true);
    updatePermissionsMutation.mutate({
      roleId: role.id,
      permissions,
    });
  };

  const handleCancel = () => {
    form.reset();
    setPermissions(role.permissions.map(p => ({
      resourceType: p.resourceType,
      action: p.action,
    })));
    onCancel?.();
  };

  // 権限が変更されているかチェック
  const isPermissionsChanged = () => {
    const originalPermissions = role.permissions.map(p => `${p.resourceType}-${p.action}`).sort();
    const currentPermissions = permissions.map(p => `${p.resourceType}-${p.action}`).sort();
    return JSON.stringify(originalPermissions) !== JSON.stringify(currentPermissions);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>ロール編集: {role.name}</CardTitle>
          <div className="flex items-center space-x-2">
            {role.isDefault && (
              <Badge variant="secondary">デフォルト</Badge>
            )}
            <Badge variant="outline">
              メンバー: {role._count.members}
            </Badge>
            <Badge variant="outline">
              グループ: {role._count.groups}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ロール名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="ロール名を入力" {...field} />
                    </FormControl>
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
                        placeholder="ロールの説明を入力（任意）"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">デフォルトロール</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        新しく招待されたメンバーに自動的に割り当てられるロールです
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* 基本情報更新ボタン */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "更新中..." : "基本情報を更新"}
              </Button>
            </div>
          </form>
        </Form>

        {/* 権限設定 */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">権限設定</Label>
            <Button
              onClick={handleUpdatePermissions}
              disabled={!isPermissionsChanged() || isPermissionsLoading}
              variant={isPermissionsChanged() ? "default" : "outline"}
            >
              {isPermissionsLoading ? "更新中..." : "権限を更新"}
            </Button>
          </div>
          
          <PermissionMatrix
            permissions={permissions}
            onChange={setPermissions}
            disabled={isPermissionsLoading}
          />
          
          {isPermissionsChanged() && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              権限設定が変更されています。「権限を更新」ボタンを押して保存してください。
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};