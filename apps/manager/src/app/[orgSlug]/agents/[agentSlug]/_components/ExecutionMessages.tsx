"use client";

import type { UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import { Response } from "@/components/response";
import { MessageParts } from "@/components/message-parts";
import { sanitizeText } from "@/lib/utils";
import { type ExecutionMessage, type MessagePart } from "@/features/chat";
import { SlackNotificationAlert } from "./SlackNotificationAlert";

type ExecutionMessagesProps = {
  messages: ExecutionMessage[] | undefined;
  isLoading: boolean;
  fallbackOutput: string;
  /** Slack通知が送信中であることを表示するか（エージェント設定ベース） */
  showSlackPendingNotification?: boolean;
  /** Slackチャンネル名（エージェント設定） */
  slackChannelName?: string | null;
};

/** パーツからtype文字列を取得 */
const getPartType = (part: MessagePart): string => {
  return typeof part.type === "string" ? part.type : "";
};

/** パーツからtext文字列を取得 */
const getPartText = (part: MessagePart): string => {
  return typeof part.text === "string" ? part.text : "";
};

/** Slack通知パーツの型 */
type SlackNotificationPartData = {
  type: "slack-notification";
  success: boolean;
  channelName?: string;
  errorCode?: string;
  errorMessage?: string;
  userAction?: string;
};

/** パーツがSlack通知パーツかどうかを判定 */
const isSlackNotificationPart = (
  part: MessagePart,
): part is SlackNotificationPartData => {
  return getPartType(part) === "slack-notification";
};

/** メッセージからSlack通知パーツを抽出 */
const findSlackNotificationPart = (
  messages: ExecutionMessage[],
): SlackNotificationPartData | null => {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (isSlackNotificationPart(part)) {
        return part;
      }
    }
  }
  return null;
};

/** ユーザーメッセージコンポーネント */
const UserMessage = ({ text }: { text: string }) => (
  <div className="flex justify-end gap-3">
    <div className="bg-primary text-primary-foreground max-w-2xl rounded-xl px-3 py-2">
      <Response>{sanitizeText(text)}</Response>
    </div>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
      <User className="h-5 w-5 text-gray-600" />
    </div>
  </div>
);

/**
 * アシスタントメッセージコンポーネント
 * 共通のMessagePartsコンポーネントを使用してMCPツールを表示
 */
const AssistantMessage = ({ message }: { message: ExecutionMessage }) => {
  // ExecutionMessage を UIMessage 形式に変換
  const uiMessage: UIMessage = {
    id: message.id,
    role: "assistant",
    parts: message.parts as UIMessage["parts"],
  };

  return (
    <div className="flex gap-3">
      <div className="ring-border bg-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <MessageParts message={uiMessage} isLoading={false} compact={true} />
      </div>
    </div>
  );
};

/**
 * 実行結果のメッセージ表示コンポーネント
 * 共通のMessagePartsを使用してチャット画面と同じUIで表示
 */
export const ExecutionMessages = ({
  messages,
  isLoading,
  fallbackOutput,
  showSlackPendingNotification,
  slackChannelName,
}: ExecutionMessagesProps) => {
  // ローディング中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  // メッセージがある場合
  if (messages && messages.length > 0) {
    // Slack通知パーツを検索（メッセージパーツから、または設定ベースで表示）
    const slackNotification = findSlackNotificationPart(messages);

    return (
      <div className="space-y-6">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              // ユーザーメッセージ: textパーツのみ表示
              message.parts
                .filter((p) => getPartType(p) === "text" && getPartText(p))
                .map((part, i) => (
                  <UserMessage key={`user-${i}`} text={getPartText(part)} />
                ))
            ) : (
              // アシスタントメッセージ: MessagePartsを使用
              <AssistantMessage message={message} />
            )}
          </div>
        ))}

        {/* Slack通知結果を表示（成功・失敗両方） */}
        {slackNotification ? (
          <SlackNotificationAlert
            success={slackNotification.success}
            channelName={slackNotification.channelName}
            errorMessage={slackNotification.errorMessage}
            userAction={slackNotification.userAction}
          />
        ) : (
          // DBからのslack-notificationパーツがない場合、エージェント設定に基づいて表示
          showSlackPendingNotification && (
            <SlackNotificationAlert
              success={true}
              channelName={slackChannelName ?? undefined}
            />
          )
        )}
      </div>
    );
  }

  // フォールバック: メッセージがない場合はoutputを直接表示
  if (fallbackOutput) {
    return (
      <div className="flex gap-3">
        <div className="ring-border bg-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <Response>{sanitizeText(fallbackOutput)}</Response>
        </div>
      </div>
    );
  }

  return <p className="text-sm text-gray-500">（出力なし）</p>;
};
