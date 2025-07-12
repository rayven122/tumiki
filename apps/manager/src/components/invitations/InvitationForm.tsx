"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";

// フォームバリデーションスキーマ
const InvitationFormSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  isAdmin: z.boolean().default(false),
  expiresInDays: z.number().min(1, "1日以上を指定してください").max(30, "30日以下で指定してください").default(7),
});

type InvitationFormData = z.infer<typeof InvitationFormSchema>;

interface InvitationFormProps {
  organizationId: string;
  onSuccess?: () => void;
}

/**
 * 招待フォームコンポーネント
 * 組織への新しいメンバー招待を作成する
 */
export const InvitationForm = ({ organizationId, onSuccess }: InvitationFormProps) => {
  const [open, setOpen] = useState(false);
  
  const form = useForm<InvitationFormData>({
    resolver: zodResolver(InvitationFormSchema),
    defaultValues: {
      email: "",
      isAdmin: false,
      expiresInDays: 7,
    },
  });

  const utils = trpc.useUtils();
  const createInvitationMutation = trpc.organizationInvitation.create.useMutation({
    onSuccess: () => {
      // 招待一覧を再取得
      void utils.organizationInvitation.getByOrganization.invalidate({ organizationId });
      
      // フォームをリセット
      form.reset();
      setOpen(false);
      
      // 成功コールバック実行
      onSuccess?.();
    },
    onError: (error) => {
      // エラーメッセージをフォームに設定
      if (error.message.includes("既に招待")) {
        form.setError("email", { message: error.message });
      } else if (error.message.includes("既にメンバー")) {
        form.setError("email", { message: error.message });
      } else {
        form.setError("root", { message: error.message });
      }
    },
  });

  const onSubmit = (data: InvitationFormData) => {
    createInvitationMutation.mutate({
      organizationId,
      email: data.email,
      isAdmin: data.isAdmin,
      expiresInDays: data.expiresInDays,
      roleIds: [], // TODO: ロール選択機能の実装
      groupIds: [], // TODO: グループ選択機能の実装
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          メンバーを招待
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailIcon className="size-5" />
            メンバー招待
          </DialogTitle>
          <DialogDescription>
            組織に新しいメンバーを招待します。招待メールが送信されます。
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    招待を送信するメールアドレスを入力してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>有効期限（日数）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    招待の有効期限を日数で指定してください（1-30日）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createInvitationMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createInvitationMutation.isPending}
              >
                {createInvitationMutation.isPending ? "招待中..." : "招待を送信"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};