"use client";

import { CheckCircle, XCircle, Loader2, type LucideIcon } from "lucide-react";
import type { UIMessage } from "@ai-sdk/react";

import { ExecutionMessages } from "./ExecutionMessages";
import {
  ExecutionModalBase,
  ExecutionErrorDisplay,
} from "./ExecutionModalBase";

type ExecutionResultModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ストリーミングメッセージ */
  messages: UIMessage[];
  /** ストリーミング中かどうか */
  isStreaming: boolean;
  /** エラーメッセージ（エラー時のみ） */
  error?: string;
  /** エージェントのSlack通知が有効かどうか */
  agentEnableSlackNotification?: boolean;
  /** エージェントのSlack通知チャンネル名 */
  agentSlackChannelName?: string | null;
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

/**
 * 実行結果モーダル（ストリーミング対応版）
 *
 * useChatのメッセージをリアルタイム表示
 */
export const ExecutionResultModal = ({
  open,
  onOpenChange,
  messages,
  isStreaming,
  error,
  agentEnableSlackNotification,
  agentSlackChannelName,
}: ExecutionResultModalProps) => {
  const hasMessages = messages.length > 0;
  const hasError = !!error;
  const status = getExecutionStatus(hasError, isStreaming, hasMessages);
  const statusInfo = STATUS_INFO[status];
  const StatusIcon = statusInfo.icon;

  // メッセージをExecutionMessages形式に変換
  const executionMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts as Record<string, unknown>[],
  }));

  const titleIcon = (
    <StatusIcon className={`h-5 w-5 ${statusInfo.iconClass}`} />
  );

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
          showSlackPendingNotification={
            agentEnableSlackNotification && !isStreaming && hasMessages
          }
          slackChannelName={agentSlackChannelName}
        />
      )}
    </ExecutionModalBase>
  );
};
