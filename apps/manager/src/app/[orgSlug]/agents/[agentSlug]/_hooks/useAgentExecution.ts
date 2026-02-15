"use client";

import { useCallback, useMemo, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AgentId } from "@/schema/ids";
import { generateCUID } from "@/lib/utils";
import { useExecutionTransport } from "@/features/chat/hooks/useExecutionTransport";

type UseAgentExecutionParams = {
  agentId: AgentId;
  organizationId: string;
  onExecutionComplete?: () => void;
};

type UseAgentExecutionReturn = {
  /** ストリーミングチャットのメッセージ */
  messages: UIMessage[];
  /** 実行中かどうか */
  isStreaming: boolean;
  /** 実行エラー */
  executionError: string | undefined;
  /** セッションが準備完了かどうか */
  isSessionReady: boolean;
  /** 実行を開始 */
  handleExecute: () => void;
  /** メッセージをクリア */
  clearMessages: () => void;
  /** エラーをクリア */
  clearError: () => void;
};

/**
 * エージェント実行用のカスタムフック
 *
 * ストリーミングベースのエージェント実行を管理する
 * - セッション管理とアクセストークンの取得
 * - mcp-proxy へのストリーミングリクエスト
 * - 実行状態とエラー管理
 */
export const useAgentExecution = ({
  agentId,
  organizationId,
  onExecutionComplete,
}: UseAgentExecutionParams): UseAgentExecutionReturn => {
  const [executionError, setExecutionError] = useState<string | undefined>();

  // prepareSendMessagesRequest をメモ化
  const prepareSendMessagesRequest = useMemo(
    () =>
      (request: { messages: UIMessage[]; body?: Record<string, unknown> }) => {
        const lastMessage = request.messages.at(-1);
        const userText =
          lastMessage?.parts?.find(
            (p): p is { type: "text"; text: string } => p.type === "text",
          )?.text ?? "タスクを実行してください。";

        return {
          body: {
            organizationId,
            message: userText,
            ...request.body,
          },
        };
      },
    [organizationId],
  );

  // 共通トランスポートを使用
  const { transport, isSessionReady } = useExecutionTransport({
    apiPath: `/agent/${agentId}`,
    prepareSendMessagesRequest,
  });

  // ストリーミング用のuseChat
  const { messages, status, sendMessage, setMessages } = useChat({
    id: `agent-execution-${agentId}`,
    generateId: generateCUID,
    transport,
    onError: (error) => {
      setExecutionError(error.message);
    },
    onFinish: () => {
      onExecutionComplete?.();
    },
  });

  const isStreaming = status === "streaming";

  const handleExecute = useCallback(() => {
    // 前回の結果をクリア
    setMessages([]);
    setExecutionError(undefined);

    // ストリーミング実行を開始
    void sendMessage({
      role: "user",
      parts: [{ type: "text", text: "タスクを実行してください。" }],
    });
  }, [sendMessage, setMessages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const clearError = useCallback(() => {
    setExecutionError(undefined);
  }, []);

  return {
    messages,
    isStreaming,
    executionError,
    isSessionReady,
    handleExecute,
    clearMessages,
    clearError,
  };
};
