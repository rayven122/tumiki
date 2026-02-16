"use client";

import { useState } from "react";
import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Textarea } from "@tumiki/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/client/toast";
import type { CreateFeedbackOutput } from "../api/schemas";

type FeedbackType = "INQUIRY" | "FEATURE_REQUEST";

type FormData = {
  type: FeedbackType;
  subject: string;
  content: string;
};

const INITIAL_FORM_DATA: FormData = {
  type: "INQUIRY",
  subject: "",
  content: "",
};

export const FeedbackForm = () => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  const createMutation = api.feedback.create.useMutation({
    onSuccess: (data: CreateFeedbackOutput) => {
      // フォームをリセット
      setFormData(INITIAL_FORM_DATA);
      // 成功トーストを表示
      toast.success(data.message);
    },
    onError: (error: { message: string }) => {
      // エラートーストを表示
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    createMutation.mutate({
      ...formData,
      userAgent: window.navigator.userAgent,
    });
  };

  const isSubmitDisabled =
    createMutation.isPending ||
    !formData.subject.trim() ||
    !formData.content.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* フィードバック種類選択 */}
      <div className="space-y-2">
        <Label htmlFor="type">お問い合わせ種類 *</Label>
        <Select
          value={formData.type}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, type: value as FeedbackType }))
          }
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INQUIRY">お問い合わせ</SelectItem>
            <SelectItem value="FEATURE_REQUEST">機能要望</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          {formData.type === "INQUIRY"
            ? "不具合報告、使い方の質問など"
            : "新機能のご提案、改善のご要望など"}
        </p>
      </div>

      {/* 件名 */}
      <div className="space-y-2">
        <Label htmlFor="subject">件名 *</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, subject: e.target.value }))
          }
          placeholder="件名を入力してください"
          maxLength={200}
          disabled={createMutation.isPending}
          required
        />
        <p className="text-muted-foreground text-sm">
          {formData.subject.length} / 200文字
        </p>
      </div>

      {/* 内容 */}
      <div className="space-y-2">
        <Label htmlFor="content">内容 *</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, content: e.target.value }))
          }
          placeholder="詳細を入力してください"
          rows={10}
          maxLength={5000}
          disabled={createMutation.isPending}
          className="resize-none"
          required
        />
        <p className="text-muted-foreground text-sm">
          {formData.content.length} / 5000文字
        </p>
      </div>

      {/* 送信ボタン */}
      <Button type="submit" disabled={isSubmitDisabled} className="w-full">
        {createMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            送信中...
          </>
        ) : (
          "送信"
        )}
      </Button>
    </form>
  );
};
