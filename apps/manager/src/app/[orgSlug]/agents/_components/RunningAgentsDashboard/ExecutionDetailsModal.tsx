"use client";

import { REALTIME_LOG_POLLING_MS } from "@/features/agents/constants";
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";

import { ExecutionModalBase } from "../../[agentSlug]/_components/ExecutionModalBase";
import { ExecutionMessages } from "../../[agentSlug]/_components/ExecutionMessages";
import { AgentIcon } from "./AgentActivityCard";
import { formatElapsedTime, formatStartTime } from "./timeUtils";
import type { ExecutionData } from "./types";

type ExecutionDetailsModalProps = {
  execution: ExecutionData | null;
  open: boolean;
  onClose: () => void;
};

/** 実行詳細モーダル（チャットUI） */
export const ExecutionDetailsModal = ({
  execution,
  open,
  onClose,
}: ExecutionDetailsModalProps) => {
  // メッセージをポーリングで取得
  const { data: messages, isLoading } = api.agentExecution.getMessages.useQuery(
    { chatId: execution?.chatId ?? "" },
    {
      enabled: open && !!execution?.chatId,
      refetchInterval: REALTIME_LOG_POLLING_MS,
    },
  );

  if (!execution) return null;

  const titleIcon = <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;

  const metadata = (
    <>
      <span>開始: {formatStartTime(execution.createdAt)}</span>
      <span>|</span>
      <span>経過: {formatElapsedTime(execution.createdAt)}</span>
    </>
  );

  // ExecutionMessagesはmessagesをそのまま使用可能

  return (
    <ExecutionModalBase
      open={open}
      onOpenChange={onClose}
      titleIcon={titleIcon}
      titleText="実行中..."
      metadata={metadata}
    >
      {execution.chatId ? (
        <ExecutionMessages
          messages={messages}
          isLoading={isLoading}
          fallbackOutput=""
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex items-center gap-3">
            <AgentIcon
              iconPath={execution.agentIconPath}
              name={execution.agentName}
            />
            <span className="text-lg font-semibold text-gray-900">
              {execution.agentName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>エージェントが処理中です...</span>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            実行が完了すると、結果がここに表示されます
          </p>
        </div>
      )}
    </ExecutionModalBase>
  );
};
