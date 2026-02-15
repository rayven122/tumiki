"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Loader2, type LucideIcon } from "lucide-react";
import type { UIMessage } from "@ai-sdk/react";

import { api } from "@/trpc/react";
import type { AgentId } from "@/schema/ids";
import { ExecutionMessages } from "./ExecutionMessages";
import {
  ExecutionModalBase,
  ExecutionErrorDisplay,
} from "./ExecutionModalBase";

type ExecutionResultModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** エージェントID */
  agentId: AgentId;
  /** ストリーミングメッセージ */
  messages: UIMessage[];
  /** ストリーミング中かどうか */
  isStreaming: boolean;
  /** エラーメッセージ（エラー時のみ） */
  error?: string;
  /** エージェントのSlack通知が有効かどうか */
  agentEnableSlackNotification?: boolean;
};

/** 実行状態を表すユニオン型 */
type ExecutionStatus = "error" | "streaming" | "completed" | "preparing";

/**
 * 実行状態を判定
 */
const getExecutionStatus = (
  hasError: boolean,
  isStreaming: boolean,
  hasMessages: boolean,
): ExecutionStatus => {
  if (hasError) return "error";
  if (isStreaming) return "streaming";
  if (hasMessages) return "completed";
  return "preparing";
};

/** ステータスごとの表示情報 */
type StatusInfo = {
  icon: LucideIcon;
  iconClass: string;
  label: string;
};

/** 状態に応じたタイトル情報 */
const STATUS_INFO: Record<ExecutionStatus, StatusInfo> = {
  error: { icon: XCircle, iconClass: "text-red-500", label: "実行失敗" },
  streaming: {
    icon: Loader2,
    iconClass: "animate-spin text-blue-500",
    label: "実行中...",
  },
  completed: {
    icon: CheckCircle,
    iconClass: "text-green-500",
    label: "実行完了",
  },
  preparing: {
    icon: Loader2,
    iconClass: "animate-spin text-gray-400",
    label: "準備中...",
  },
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

/** DB保存完了を待つための遅延時間（ミリ秒） */
const SLACK_NOTIFICATION_FETCH_DELAY_MS = 1500;

/** メッセージからSlack通知パーツを抽出 */
const findSlackNotificationPart = (
  messages: Array<{ role: string; parts: Record<string, unknown>[] }>,
): SlackNotificationPartData | null => {
  const allParts = messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => message.parts);

  const slackPart = allParts.find((part) => part.type === "slack-notification");
  return (slackPart as unknown as SlackNotificationPartData) ?? null;
};

/**
 * 実行結果モーダル（ストリーミング対応版）
 *
 * useChatのメッセージをリアルタイム表示
 * ストリーミング完了後、DBからSlack通知結果を取得
 */
export const ExecutionResultModal = ({
  open,
  onOpenChange,
  agentId,
  messages,
  isStreaming,
  error,
  agentEnableSlackNotification,
}: ExecutionResultModalProps) => {
  const hasMessages = messages.length > 0;
  const hasError = !!error;
  const status = getExecutionStatus(hasError, isStreaming, hasMessages);
  const statusInfo = STATUS_INFO[status];
  const StatusIcon = statusInfo.icon;

  // Slack通知結果を保持
  const [slackNotification, setSlackNotification] =
    useState<SlackNotificationPartData | null>(null);
  // Slack通知を取得中かどうか
  const [isFetchingSlack, setIsFetchingSlack] = useState(false);

  // 前回のストリーミング状態を追跡
  const prevIsStreamingRef = useRef(isStreaming);

  // 最新の実行メッセージを取得するクエリ
  const { refetch: refetchLatestMessages } =
    api.agentExecution.getLatestExecutionMessages.useQuery(
      { agentId },
      {
        enabled: false, // 手動で呼び出す
      },
    );

  // ストリーミング完了を検知してDBから取得
  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current;
    prevIsStreamingRef.current = isStreaming;

    // ストリーミングが完了した（true → false）かつSlack通知が有効な場合
    if (
      wasStreaming &&
      !isStreaming &&
      hasMessages &&
      !hasError &&
      agentEnableSlackNotification
    ) {
      // 少し待ってからDBを問い合わせる（onFinishでのDB保存完了を待つ）
      setIsFetchingSlack(true);
      const timeoutId = setTimeout(() => {
        refetchLatestMessages()
          .then((result) => {
            if (result.data) {
              const slackPart = findSlackNotificationPart(result.data);
              setSlackNotification(slackPart);
            }
          })
          .catch(() => {
            // エラー時は何もしない（Slack通知取得は必須機能ではないため）
          })
          .finally(() => {
            setIsFetchingSlack(false);
          });
      }, SLACK_NOTIFICATION_FETCH_DELAY_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [
    isStreaming,
    hasMessages,
    hasError,
    agentEnableSlackNotification,
    refetchLatestMessages,
  ]);

  // モーダルが閉じられたらSlack通知状態をリセット
  useEffect(() => {
    if (!open) {
      setSlackNotification(null);
      setIsFetchingSlack(false);
    }
  }, [open]);

  // メッセージをExecutionMessages形式に変換
  const executionMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts as Record<string, unknown>[],
  }));

  const titleIcon = (
    <StatusIcon className={`h-5 w-5 ${statusInfo.iconClass}`} />
  );

  // Slack通知取得中かどうか（Slack通知が有効な場合のみ表示）
  const showSlackFetchingIndicator =
    isFetchingSlack && agentEnableSlackNotification;

  return (
    <ExecutionModalBase
      open={open}
      onOpenChange={onOpenChange}
      titleIcon={titleIcon}
      titleText={statusInfo.label}
    >
      {hasError ? (
        <ExecutionErrorDisplay error={error} />
      ) : (
        <ExecutionMessages
          messages={executionMessages}
          isLoading={!hasMessages && isStreaming}
          fallbackOutput=""
          slackNotification={slackNotification}
          isFetchingSlackNotification={showSlackFetchingIndicator}
        />
      )}
    </ExecutionModalBase>
  );
};
