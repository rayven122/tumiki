"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { PermissionSelector } from "./PermissionSelector";
import type { ListRolesOutput } from "@/server/api/routers/v2/role/list";
import { Tag, Pencil } from "lucide-react";

const editRoleSchema = z.object({
  name: z
    .string()
    .min(1, "ロール名は必須です")
    .max(100, "ロール名は100文字以内で入力してください")
    .optional(),
  description: z
    .string()
    .max(500, "説明は500文字以内で入力してください")
    .optional(),
  isDefault: z.boolean().optional(),
  permissions: z.array(
    z.object({
      resourceType: z.enum([
        "MCP_SERVER_CONFIG",
        "MCP_SERVER",
        "MCP_SERVER_TEMPLATE",
      ]),
      resourceId: z.string(),
      read: z.boolean(),
      write: z.boolean(),
      execute: z.boolean(),
    }),
  ),
});

type EditRoleFormData = z.infer<typeof editRoleSchema>;

type EditRoleDialogProps = {
  role: ListRolesOutput[number];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const EditRoleDialog = ({
  role,
  open,
  onOpenChange,
}: EditRoleDialogProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EditRoleFormData>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      name: role.name,
      description: role.description ?? "",
      isDefault: role.isDefault,
      permissions: role.permissions ?? [],
    },
  });

  // ロールが変更された場合、フォームをリセット
  useEffect(() => {
    reset({
      name: role.name,
      description: role.description ?? "",
      isDefault: role.isDefault,
      permissions: role.permissions ?? [],
    });
  }, [role, reset]);

  const utils = api.useUtils();

  const updateMutation = api.v2.role.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      void utils.v2.role.list.invalidate();
      toast.success("ロールを更新しました");
    },
    onError: (error) => {
      if (error.data?.code === "FORBIDDEN") {
        toast.error("ロールを更新する権限がありません");
      } else if (error.data?.code === "NOT_FOUND") {
        toast.error("指定されたロールが見つかりません");
      } else {
        toast.error(`ロールの更新に失敗しました: ${error.message}`);
      }
    },
  });

  const onSubmit = (data: EditRoleFormData) => {
    updateMutation.mutate({
      slug: role.slug,
      ...data,
    });
  };

  const permissions = watch("permissions");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Pencil className="text-primary h-6 w-6" />
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl">ロールを編集</DialogTitle>
            <DialogDescription className="mt-1.5">
              「{role.name}」の設定を変更します
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* ロール識別子（変更不可） */}
          <div className="bg-muted/50 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Tag className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs font-medium">
                ロール識別子（変更不可）
              </span>
            </div>
            <p className="mt-1 font-mono text-sm">{role.slug}</p>
          </div>

          {/* ロール名 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              ロール名
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="例: データエンジニア"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* 説明 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              説明
              <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                （任意）
              </span>
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="このロールの目的や権限内容を説明してください"
              rows={2}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-destructive text-xs">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* 権限設定 */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">権限設定</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                MCPサーバーへのアクセス権限を設定します
              </p>
            </div>
            <PermissionSelector
              value={permissions}
              onChange={(newPermissions) =>
                setValue("permissions", newPermissions)
              }
            />
          </div>

          {errors.permissions && (
            <p className="text-destructive text-xs">
              {errors.permissions.message}
            </p>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
