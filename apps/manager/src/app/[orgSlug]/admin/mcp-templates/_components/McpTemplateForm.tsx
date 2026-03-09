"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@tumiki/ui/form";
import { Input } from "@tumiki/ui/input";
import { Textarea } from "@tumiki/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { TransportType, AuthType, McpServerVisibility } from "@tumiki/db";
import { api } from "@/trpc/react";
import { toast } from "sonner";

// フォームスキーマ
const mcpTemplateFormSchema = z
  .object({
    name: z.string().min(1, "名前は必須です"),
    normalizedName: z.string().min(1, "識別子は必須です"),
    description: z.string().optional(),
    tags: z.string().optional(),
    iconPath: z.string().optional(),
    transportType: z.nativeEnum(TransportType),
    command: z.string().optional(),
    args: z.string().optional(),
    url: z.string().optional(),
    envVarKeys: z.string().optional(),
    authType: z.nativeEnum(AuthType),
    oauthProvider: z.string().optional(),
    oauthScopes: z.string().optional(),
    useCloudRunIam: z.boolean(),
    visibility: z.nativeEnum(McpServerVisibility),
  })
  .refine(
    (data) => {
      if (data.transportType === TransportType.STDIO) {
        return !!data.command;
      }
      if (
        data.transportType === TransportType.SSE ||
        data.transportType === TransportType.STREAMABLE_HTTPS
      ) {
        return !!data.url;
      }
      return true;
    },
    {
      message: "STDIO接続にはcommandが、SSE/HTTPS接続にはurlが必須です",
      path: ["command"],
    },
  );

type McpTemplateFormData = z.infer<typeof mcpTemplateFormSchema>;

type McpTemplateFormProps = {
  orgSlug: string;
  templateId?: string;
  defaultValues?: Partial<McpTemplateFormData>;
};

export const McpTemplateForm = ({
  orgSlug,
  templateId,
  defaultValues,
}: McpTemplateFormProps) => {
  const router = useRouter();
  const utils = api.useUtils();

  const isEditMode = !!templateId;

  const createMutation = api.mcpServerTemplate.create.useMutation({
    onSuccess: async () => {
      toast.success("テンプレートを作成しました");
      await utils.mcpServerTemplate.list.invalidate();
      router.push(`/${orgSlug}/admin/mcp-templates`);
    },
    onError: (error) => {
      toast.error(error.message || "テンプレートの作成に失敗しました");
    },
  });

  const updateMutation = api.mcpServerTemplate.update.useMutation({
    onSuccess: async () => {
      toast.success("テンプレートを更新しました");
      await utils.mcpServerTemplate.list.invalidate();
      router.push(`/${orgSlug}/admin/mcp-templates`);
    },
    onError: (error) => {
      toast.error(error.message || "テンプレートの更新に失敗しました");
    },
  });

  const form = useForm<McpTemplateFormData>({
    resolver: zodResolver(mcpTemplateFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      normalizedName: defaultValues?.normalizedName ?? "",
      description: defaultValues?.description ?? "",
      tags: defaultValues?.tags ?? "",
      iconPath: defaultValues?.iconPath ?? "",
      transportType: defaultValues?.transportType ?? TransportType.STDIO,
      command: defaultValues?.command ?? "",
      args: defaultValues?.args ?? "",
      url: defaultValues?.url ?? "",
      envVarKeys: defaultValues?.envVarKeys ?? "",
      authType: defaultValues?.authType ?? AuthType.NONE,
      oauthProvider: defaultValues?.oauthProvider ?? "",
      oauthScopes: defaultValues?.oauthScopes ?? "",
      useCloudRunIam: defaultValues?.useCloudRunIam ?? false,
      visibility: defaultValues?.visibility ?? McpServerVisibility.PRIVATE,
    },
  });

  const watchTransportType = form.watch("transportType");
  const watchAuthType = form.watch("authType");

  const onSubmit = async (data: McpTemplateFormData) => {
    const payload = {
      name: data.name,
      normalizedName: data.normalizedName,
      description: data.description ?? undefined,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
      iconPath: data.iconPath ?? undefined,
      transportType: data.transportType,
      command: data.command ?? undefined,
      args: data.args ? data.args.split(",").map((a) => a.trim()) : [],
      url: data.url ?? undefined,
      envVarKeys: data.envVarKeys
        ? data.envVarKeys.split(",").map((k) => k.trim())
        : [],
      authType: data.authType,
      oauthProvider: data.oauthProvider ?? undefined,
      oauthScopes: data.oauthScopes
        ? data.oauthScopes.split(",").map((s) => s.trim())
        : [],
      useCloudRunIam: data.useCloudRunIam,
      visibility: data.visibility,
    };

    if (isEditMode && templateId) {
      await updateMutation.mutateAsync({ id: templateId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例: GitHub MCP" {...field} />
                  </FormControl>
                  <FormDescription>テンプレートの表示名</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="normalizedName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>識別子 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例: github" {...field} />
                  </FormControl>
                  <FormDescription>
                    システム内で一意の識別子（半角英数字・ハイフン）
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
                      placeholder="テンプレートの説明を入力"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タグ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: github, vcs, collaboration（カンマ区切り）"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    カンマ区切りでタグを入力してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>公開範囲</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as McpServerVisibility)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={McpServerVisibility.PRIVATE}>
                        非公開（組織内のみ）
                      </SelectItem>
                      <SelectItem value={McpServerVisibility.PUBLIC}>
                        公開（全ユーザー）
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 接続設定 */}
        <Card>
          <CardHeader>
            <CardTitle>接続設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="transportType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>接続タイプ *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as TransportType)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TransportType.STDIO}>STDIO</SelectItem>
                      <SelectItem value={TransportType.SSE}>SSE</SelectItem>
                      <SelectItem value={TransportType.STREAMABLE_HTTPS}>
                        STREAMABLE_HTTPS
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchTransportType === TransportType.STDIO && (
              <>
                <FormField
                  control={form.control}
                  name="command"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>コマンド *</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="コマンドを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="npx">npx</SelectItem>
                          <SelectItem value="node">node</SelectItem>
                          <SelectItem value="python">python</SelectItem>
                          <SelectItem value="python3">python3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        実行するコマンド（npx/node/python/python3）
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="args"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>引数</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例: -y, @modelcontextprotocol/server-github（カンマ区切り）"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        コマンドラインの引数をカンマ区切りで入力
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {(watchTransportType === TransportType.SSE ||
              watchTransportType === TransportType.STREAMABLE_HTTPS) && (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/mcp"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      MCPサーバーのエンドポイント
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="envVarKeys"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>環境変数キー</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: GITHUB_TOKEN, API_KEY（カンマ区切り）"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    必要な環境変数名をカンマ区切りで入力
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 認証設定 */}
        <Card>
          <CardHeader>
            <CardTitle>認証設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>認証タイプ</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as AuthType)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={AuthType.NONE}>なし</SelectItem>
                      <SelectItem value={AuthType.API_KEY}>API Key</SelectItem>
                      <SelectItem value={AuthType.OAUTH}>OAuth</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchAuthType === AuthType.OAUTH && (
              <>
                <FormField
                  control={form.control}
                  name="oauthProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OAuthプロバイダー</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例: github, google"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oauthScopes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OAuthスコープ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例: repo, user（カンマ区切り）"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        必要なスコープをカンマ区切りで入力
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* 送信ボタン */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${orgSlug}/admin/mcp-templates`)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
