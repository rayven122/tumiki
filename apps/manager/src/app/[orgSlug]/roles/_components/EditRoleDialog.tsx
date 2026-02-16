"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Textarea } from "@tumiki/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { PermissionSelector, type McpPermission } from "./PermissionSelector";
import { mapDbToUiAccess, mapUiPermissionToDb } from "./permissionMapping";
import type { ListRolesOutput } from "@/features/roles/api/list";
import { Tag, Pencil } from "lucide-react";

// フォームで使用するスキーマ（UI用の access/manage 形式）
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
  // デフォルト権限（UI用: access/manage）
  defaultAccess: z.boolean().optional(),
  defaultManage: z.boolean().optional(),
  // 特定MCPサーバーへの追加権限（UI用: access/manage）
  mcpPermissions: z.array(
    z.object({
      mcpServerId: z.string(),
      access: z.boolean(),
      manage: z.boolean(),
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
  // DB用の read/write/execute をUI用の access/manage に変換（useCallbackでメモ化）
  const mapMcpPermissions = useCallback(
    (
      mcpPermissions: typeof role.mcpPermissions,
    ): EditRoleFormData["mcpPermissions"] => {
      return (mcpPermissions ?? []).map((p) => ({
        mcpServerId: p.mcpServerId,
        access: mapDbToUiAccess(p.read, p.execute),
        manage: p.write,
      }));
    },
    [],
  );

  // DB用のデフォルト権限をUI用に変換
  const getDefaultAccess = useCallback((): boolean => {
    return mapDbToUiAccess(role.defaultRead, role.defaultExecute);
  }, [role.defaultRead, role.defaultExecute]);

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
      defaultAccess: getDefaultAccess(),
      defaultManage: role.defaultWrite,
      mcpPermissions: mapMcpPermissions(role.mcpPermissions),
    },
  });

  // ロールが変更された場合、フォームをリセット
  useEffect(() => {
    reset({
      name: role.name,
      description: role.description ?? "",
      isDefault: role.isDefault,
      defaultAccess: mapDbToUiAccess(role.defaultRead, role.defaultExecute),
      defaultManage: role.defaultWrite,
      mcpPermissions: mapMcpPermissions(role.mcpPermissions),
    });
  }, [role, reset, mapMcpPermissions]);

  const utils = api.useUtils();

  // 組織内のMCPサーバー一覧を取得
  const { data: mcpServers, isLoading: isLoadingServers } =
    api.userMcpServer.findMcpServers.useQuery(undefined, {
      enabled: open,
    });

  // MCPサーバーのオプション形式に変換（iconPathを含む）
  // McpServer自体のiconPathを優先し、なければテンプレートのiconPathをフォールバック
  const mcpServerOptions = useMemo(() => {
    return (mcpServers ?? []).map((server) => ({
      id: server.id,
      name: server.name,
      iconPath:
        server.iconPath ??
        server.templateInstances?.[0]?.mcpServerTemplate?.iconPath ??
        null,
    }));
  }, [mcpServers]);

  const updateMutation = api.role.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      void utils.role.list.invalidate();
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
    // UI用の access/manage をDB用の read/write/execute に変換
    // 統一されたマッピングロジックを使用
    const defaultAccess = data.defaultAccess ?? false;
    updateMutation.mutate({
      slug: role.slug,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault,
      defaultRead: defaultAccess,
      defaultWrite: data.defaultManage ?? false,
      defaultExecute: defaultAccess,
      mcpPermissions: data.mcpPermissions.map(mapUiPermissionToDb),
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
              defaultAccess={watch("defaultAccess") ?? false}
              defaultManage={watch("defaultManage") ?? false}
              onDefaultChange={(key, value) => {
                if (key === "access") {
                  setValue("defaultAccess", value);
                } else {
                  setValue("defaultManage", value);
                }
              }}
              mcpPermissions={mcpPermissions}
              onMcpPermissionsChange={(newPermissions: McpPermission[]) =>
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
