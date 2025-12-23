"use client";

import { useEffect, useMemo } from "react";
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
  // デフォルト権限（全MCPサーバーに適用）
  defaultRead: z.boolean().optional(),
  defaultWrite: z.boolean().optional(),
  defaultExecute: z.boolean().optional(),
  // 特定MCPサーバーへの追加権限
  mcpPermissions: z.array(
    z.object({
      mcpServerId: z.string(),
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
  // MCPサーバー権限をフォーム用の型に変換
  const mapMcpPermissions = (
    mcpPermissions: typeof role.mcpPermissions,
  ): EditRoleFormData["mcpPermissions"] => {
    return (mcpPermissions ?? []).map((p) => ({
      mcpServerId: p.mcpServerId,
      read: p.read,
      write: p.write,
      execute: p.execute,
    }));
  };

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
      defaultRead: role.defaultRead,
      defaultWrite: role.defaultWrite,
      defaultExecute: role.defaultExecute,
      mcpPermissions: mapMcpPermissions(role.mcpPermissions),
    },
  });

  // ロールが変更された場合、フォームをリセット
  useEffect(() => {
    reset({
      name: role.name,
      description: role.description ?? "",
      isDefault: role.isDefault,
      defaultRead: role.defaultRead,
      defaultWrite: role.defaultWrite,
      defaultExecute: role.defaultExecute,
      mcpPermissions: mapMcpPermissions(role.mcpPermissions),
    });
  }, [role, reset]);

  const utils = api.useUtils();

  // 組織内のMCPサーバー一覧を取得
  const { data: mcpServers, isLoading: isLoadingServers } =
    api.v2.userMcpServer.findOfficialServers.useQuery(undefined, {
      enabled: open,
    });

  // MCPサーバーのオプション形式に変換
  const mcpServerOptions = useMemo(() => {
    return (mcpServers ?? []).map((server) => ({
      id: server.id,
      name: server.name,
    }));
  }, [mcpServers]);

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

  const mcpPermissions = watch("mcpPermissions");

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
          {/* ロール名とロール識別子 */}
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

            {/* ロール識別子（ロール名の直下、変更不可） */}
            <div className="bg-muted/50 mt-2 flex items-center gap-2 rounded-md px-3 py-2">
              <Tag className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-muted-foreground text-xs">識別子:</span>
              <span className="font-mono text-xs">{role.slug}</span>
            </div>
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
              defaultRead={watch("defaultRead") ?? false}
              defaultWrite={watch("defaultWrite") ?? false}
              defaultExecute={watch("defaultExecute") ?? false}
              onDefaultChange={(key, value) => setValue(key, value)}
              mcpPermissions={mcpPermissions}
              onMcpPermissionsChange={(newPermissions) =>
                setValue("mcpPermissions", newPermissions)
              }
              mcpServers={mcpServerOptions}
              isLoading={isLoadingServers}
            />
          </div>

          {errors.mcpPermissions && (
            <p className="text-destructive text-xs">
              {errors.mcpPermissions.message}
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
