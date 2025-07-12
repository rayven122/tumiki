"use client";

import { useState } from "react";
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
import { PermissionMatrix } from "./PermissionMatrix";
import type { Permission } from "@/lib/permissions";

const createRoleSchema = z.object({
  name: z.string().min(1, "ロール名は必須です").max(100, "ロール名は100文字以内で入力してください"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;

interface RoleCreateFormProps {
  organizationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RoleCreateForm = ({ organizationId, onSuccess, onCancel }: RoleCreateFormProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
    },
  });

  const createRoleMutation = trpc.organizationRole.create.useMutation({
    onSuccess: () => {
      toast.success("ロールが作成されました");
      form.reset();
      setPermissions([]);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "ロールの作成に失敗しました");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit = async (data: CreateRoleFormData) => {
    setIsLoading(true);
    
    createRoleMutation.mutate({
      organizationId,
      name: data.name,
      description: data.description || undefined,
      isDefault: data.isDefault,
      permissions,
    });
  };

  const handleCancel = () => {
    form.reset();
    setPermissions([]);
    onCancel?.();
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>新しいロールを作成</CardTitle>
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

            {/* 権限設定 */}
            <div className="space-y-4">
              <Label className="text-base font-medium">権限設定</Label>
              <PermissionMatrix
                permissions={permissions}
                onChange={setPermissions}
                disabled={isLoading}
              />
            </div>

            {/* アクションボタン */}
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
                {isLoading ? "作成中..." : "ロールを作成"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};