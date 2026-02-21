"use client";

import { useMemo } from "react";
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
import { mapUiPermissionToDb } from "./permissionMapping";
import { Tag, Shield } from "lucide-react";

// ロール名からスラッグを自動生成（英数字のみ抽出、日本語のみの場合はタイムスタンプ使用）
const generateSlugFromName = (name: string): string => {
  if (!name.trim()) return "";

  const alphanumeric = name.replace(/[^a-zA-Z0-9\s\-_]/g, "");

  if (!alphanumeric.trim()) {
    return `role-${Date.now().toString(36)}`;
  }

  return alphanumeric
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// フォームで使用するスキーマ（UI用の access/manage 形式）
const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "ロール名は必須です")
    .max(100, "ロール名は100文字以内で入力してください"),
  description: z
    .string()
    .max(500, "説明は500文字以内で入力してください")
    .optional(),
  isDefault: z.boolean(),
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

type CreateRoleFormData = z.infer<typeof createRoleSchema>;

type CreateRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CreateRoleDialog = ({
  open,
  onOpenChange,
}: CreateRoleDialogProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
      defaultAccess: false,
      defaultManage: false,
      mcpPermissions: [],
    },
  });

  const utils = api.useUtils();
  const name = watch("name");
  const mcpPermissions = watch("mcpPermissions");

  // ロール名からスラッグを自動生成
  const generatedSlug = useMemo(() => generateSlugFromName(name), [name]);

  // 組織内のMCPサーバー一覧を取得
  const { data: mcpServers, isLoading: isLoadingServers } =
    api.userMcpServer.findMcpServers.useQuery(undefined, {
      enabled: open,
    });

  // MCPサーバーのオプション形式に変換（サーバー自身のiconPathを優先、なければテンプレートのiconPathを使用）
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

  const createMutation = api.role.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      reset();
      void utils.role.list.invalidate();
      toast.success("ロールを作成しました");
    },
    onError: (error) => {
      if (error.data?.code === "FORBIDDEN") {
        toast.error("ロールを作成する権限がありません");
      } else if (error.message.includes("予約語")) {
        toast.error("このロール識別子は予約語のため使用できません");
      } else if (error.message.includes("既に存在")) {
        toast.error("このロール識別子は既に使用されています");
      } else {
        toast.error(`ロールの作成に失敗しました: ${error.message}`);
      }
    },
  });

  const onSubmit = (data: CreateRoleFormData) => {
    if (!generatedSlug) {
      toast.error("ロール名を入力してください");
      return;
    }

    const defaultAccess = data.defaultAccess ?? false;
    createMutation.mutate({
      slug: generatedSlug,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault,
      defaultRead: defaultAccess,
      defaultWrite: data.defaultManage ?? false,
      defaultExecute: defaultAccess,
      mcpPermissions: data.mcpPermissions.map(mapUiPermissionToDb),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Shield className="text-primary h-6 w-6" />
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl">新しいロールを作成</DialogTitle>
            <DialogDescription className="mt-1.5">
              カスタムロールを作成し、MCPサーバーへのアクセス権限を設定します
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* ロール名とロール識別子 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              ロール名 <span className="text-destructive">*</span>
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

            {/* ロール識別子プレビュー（ロール名の直下） */}
            {generatedSlug && (
              <div className="bg-muted/50 mt-2 flex items-center gap-2 rounded-md px-3 py-2">
                <Tag className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-muted-foreground text-xs">識別子:</span>
                <span className="font-mono text-xs">{generatedSlug}</span>
              </div>
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
              disabled={createMutation.isPending || !generatedSlug}
              className="flex-1"
            >
              {createMutation.isPending ? "作成中..." : "作成"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
