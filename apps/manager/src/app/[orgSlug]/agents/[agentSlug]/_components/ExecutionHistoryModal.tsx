"use client";

import { CheckCircle, XCircle } from "lucide-react";

import { api } from "@/trpc/react";
import { ExecutionMessages } from "./ExecutionMessages";
import {
  ExecutionModalBase,
  ExecutionErrorDisplay,
} from "./ExecutionModalBase";

/** 実行結果の型 */
type ExecutionResult = {
  success: boolean;
  executionId: string;
  output: string;
  durationMs: number;
  chatId?: string;
  error?: string;
};

type ExecutionHistoryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ExecutionResult | null;
  /** 組織スラッグ（チャットページ遷移用） */
  orgSlug: string;
};

/**
 * 実行履歴モーダル
 *
 * 過去の実行結果をDBから取得して表示
 */
export const ExecutionHistoryModal = ({
  open,
  onOpenChange,
  result,
  orgSlug,
}: ExecutionHistoryModalProps) => {
  // chatIdがある場合はメッセージを取得
  const { data: messages, isLoading } = api.agent.getExecutionMessages.useQuery(
    { chatId: result?.chatId ?? "" },
    {
      enabled: open && !!result?.chatId,
    },
  );

  if (!result) return null;

  const chatPageUrl = result.chatId
    ? `/${orgSlug}/chat/${result.chatId}`
    : null;

  const titleIcon = result.success ? (
    <CheckCircle className="h-5 w-5 text-green-500" />
  ) : (
    <XCircle className="h-5 w-5 text-red-500" />
  );

  const metadata = (
    <>
      {result.executionId && (
        <span>実行ID: {result.executionId.slice(0, 8)}...</span>
      )}
      {result.durationMs > 0 && (
        <span>実行時間: {(result.durationMs / 1000).toFixed(1)}秒</span>
      )}
    </>
  );

  return (
    <ExecutionModalBase
      open={open}
      onOpenChange={onOpenChange}
      titleIcon={titleIcon}
      titleText={result.success ? "実行完了" : "実行失敗"}
      chatPageUrl={chatPageUrl}
      metadata={metadata}
    >
      {result.error ? (
        <ExecutionErrorDisplay error={result.error} />
      ) : (
        <ExecutionMessages
          messages={messages}
          isLoading={isLoading}
          fallbackOutput={result.output}
        />
      )}
    </ExecutionModalBase>
  );
};
