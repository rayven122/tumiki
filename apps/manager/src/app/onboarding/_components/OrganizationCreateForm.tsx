"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
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
import { toast } from "@/utils/client/toast";

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
  description: z.string().optional(),
});

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

type OrganizationCreateFormProps = {
  onSuccess?: () => void;
};

export const OrganizationCreateForm = ({
  onSuccess,
}: OrganizationCreateFormProps) => {
  const utils = api.useUtils();
  const { update: updateSession } = useSession();

  const createMutation = api.v2.organization.create.useMutation({
    onSuccess: async (data) => {
      toast.success(`組織「${data.name}」が正常に作成されました。`);
      // すべてのtRPCクエリをinvalidate
      await utils.invalidate();
      // Auth.jsセッションを更新
      await updateSession();
      // フォームをリセット
      form.reset();
      onSuccess?.();
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
              <FormLabel>組織名 *</FormLabel>
              <FormControl>
                <Input placeholder="組織名を入力してください" {...field} />
              </FormControl>
              <FormDescription>
                組織の名前を入力してください（100文字以内）
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
              <FormLabel>説明（任意）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="組織の説明を入力してください"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                組織の目的や概要を説明してください
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
            組織を作成
          </Button>
        </div>
      </form>
    </Form>
  );
};
