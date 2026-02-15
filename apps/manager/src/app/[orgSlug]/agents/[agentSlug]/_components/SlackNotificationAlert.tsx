"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type SlackNotificationAlertProps = {
  /** 通知が成功したか */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
  /** ユーザーが取るべきアクション（失敗時） */
  userAction?: string;
};

/**
 * Slack通知結果を表示するアラートコンポーネント
 *
 * 通知失敗時のみ表示され、エラー内容と対処法を案内する
 */
export const SlackNotificationAlert = ({
  success,
  errorMessage,
  userAction,
}: SlackNotificationAlertProps) => {
  // 成功時は何も表示しない
  if (success) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Slack通知に失敗しました</AlertTitle>
      <AlertDescription>
        {errorMessage && <p>{errorMessage}</p>}
        {userAction && (
          <p className="mt-1 text-sm opacity-90">対処法: {userAction}</p>
        )}
      </AlertDescription>
    </Alert>
  );
};
