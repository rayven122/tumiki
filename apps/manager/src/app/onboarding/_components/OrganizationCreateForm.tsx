"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { normalizeSlug } from "@tumiki/db/utils/slug";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/client/toast";

/**
 * 組織名からslugプレビューを生成
 * 空文字列の場合はプレースホルダーを表示
 */
const generateSlugPreview = (name: string): string => {
  const normalized = normalizeSlug(name);
  // 空文字列になった場合（日本語名など）、プレースホルダーを表示
  return normalized || "org-xxxxxx";
};

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "チーム名は必須です")
    .max(100, "チーム名は100文字以内で入力してください"),
  description: z.string().optional(),
});

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

type OrganizationCreateFormProps = {
  onSuccess?: (newOrgSlug: string) => void;
};

export const OrganizationCreateForm = ({
  onSuccess,
}: OrganizationCreateFormProps) => {
  const utils = api.useUtils();
  const { update: updateSession } = useSession();

  const createMutation = api.organization.create.useMutation({
    onSuccess: async (data) => {
      toast.success(`チーム「${data.name}」が正常に作成されました。`);
      // すべてのtRPCクエリをinvalidate
      await utils.invalidate();
      // Auth.jsセッションを更新
      await updateSession({});
      // フォームをリセット
      form.reset();
      // 新しい組織の slug を渡す
      onSuccess?.(data.slug);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // 組織名の変更をリアルタイムで監視してslugプレビューを表示
  const watchedName = form.watch("name");
  const slugPreview = generateSlugPreview(watchedName);

  const onSubmit = async (data: CreateOrganizationFormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>チーム名 *</FormLabel>
              <FormControl>
                <Input placeholder="チーム名を入力してください" {...field} />
              </FormControl>
              <FormDescription>
                チームの名前を入力してください（100文字以内）
              </FormDescription>
              {/* slugプレビュー表示 */}
              {watchedName && (
                <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">チームURL: </span>
                  <code className="font-mono text-gray-700">
                    /{slugPreview}/mcps
                  </code>
                  {slugPreview === "org-xxxxxx" && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      （日本語名の場合はランダムなIDが生成されます）
                    </span>
                  )}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明（任意）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="チームの説明を入力してください"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                チームの目的や概要を説明してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={createMutation.isPending}
          >
            リセット
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            チームを作成
          </Button>
        </div>
      </form>
    </Form>
  );
};
