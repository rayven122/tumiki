"use client";

import { Alert, AlertDescription, AlertTitle } from "@tumiki/ui/alert";
import { AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";

type SlackNotificationAlertProps = {
  /** 通知が成功したか */
  success: boolean;
  /** 送信先チャンネル名（成功時に表示） */
  channelName?: string;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
  /** ユーザーが取るべきアクション（失敗時） */
  userAction?: string;
};

/**
 * Slack通知結果を表示するアラートコンポーネント
 *
 * 成功時・失敗時の両方を表示
 */
export const SlackNotificationAlert = ({
  success,
  channelName,
  errorMessage,
  userAction,
}: SlackNotificationAlertProps) => {
  if (success) {
    return (
      <Alert className="mt-4 border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">
          Slack通知を送信しました
        </AlertTitle>
        {channelName && (
          <AlertDescription className="text-green-700">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />#{channelName}
            </span>
          </AlertDescription>
        )}
      </Alert>
    );
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
