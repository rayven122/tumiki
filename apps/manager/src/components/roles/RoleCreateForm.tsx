"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PermissionMatrix } from "./PermissionMatrix";
import { api } from "@/trpc/react";
import { type Permission } from "@/lib/permissions";
import { Plus, Loader2 } from "lucide-react";

// フォームスキーマ
const createRoleSchema = z.object({
  name: z.string().min(1, "ロール名は必須です").max(100, "ロール名は100文字以内で入力してください"),
  description: z.string().optional(),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;

interface RoleCreateFormProps {
  organizationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RoleCreateForm = ({ organizationId, onSuccess, onCancel }: RoleCreateFormProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // ロール作成のmutation
  const createRoleMutation = api.organizationRole.create.useMutation({
    onSuccess: () => {
      toast.success("ロールを作成しました");
      form.reset();
      setPermissions([]);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`ロールの作成に失敗しました: ${error.message}`);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: CreateRoleFormData) => {
    setIsSubmitting(true);
    createRoleMutation.mutate({
      organizationId,
      name: data.name,
      description: data.description || undefined,
      permissions: permissions.length > 0 ? permissions : undefined,
    });
  };

  const handleCancel = () => {
    form.reset();
    setPermissions([]);
    onCancel?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          新しいロールを作成
        </CardTitle>
        <CardDescription>
          組織内で使用する新しいロールを作成し、権限を設定できます
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
                ロールを作成
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};