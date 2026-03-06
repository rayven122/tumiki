"use client";

import { Button } from "@tumiki/ui/button";
import { Card, CardContent } from "@tumiki/ui/card";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type ErrorType = "NOT_FOUND" | "GONE" | "FORBIDDEN" | "UNKNOWN";

type InviteErrorProps = {
  errorType: ErrorType;
  organizationSlug?: string;
};

const ERROR_MESSAGES: Record<
  ErrorType,
  { title: string; description: string }
> = {
  NOT_FOUND: {
    title: "招待が見つかりません",
    description: "招待リンクが無効です。管理者に再招待を依頼してください。",
  },
  GONE: {
    title: "招待の有効期限が切れています",
    description: "この招待は期限切れです。管理者に再招待を依頼してください。",
  },
  FORBIDDEN: {
    title: "メールアドレスが一致しません",
    description:
      "この招待はあなたのメールアドレス宛ではありません。招待メール記載のアドレスでログインしてください。",
  },
  UNKNOWN: {
    title: "エラーが発生しました",
    description:
      "予期しないエラーが発生しました。しばらくしてから再試行してください。",
  },
};

export const InviteError = ({
  errorType,
  organizationSlug,
}: InviteErrorProps) => {
  const router = useRouter();
  const message = ERROR_MESSAGES[errorType];

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
          <h1 className="mb-2 text-2xl font-bold text-red-900">
            {message.title}
          </h1>
          <p className="mb-6 text-sm text-red-700">{message.description}</p>
          <Button
            onClick={() =>
              router.push(organizationSlug ? `/${organizationSlug}/mcps` : "/")
            }
            className="w-full"
          >
            ホームへ戻る
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
