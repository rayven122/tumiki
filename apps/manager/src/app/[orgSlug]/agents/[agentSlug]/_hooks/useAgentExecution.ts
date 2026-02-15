"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSession } from "next-auth/react";
import type { AgentId } from "@/schema/ids";
import { getProxyServerUrl } from "@/lib/url";
import { generateCUID, fetchWithErrorHandlers } from "@/lib/utils";

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

  // セッション情報を取得
  const { data: session, status: sessionStatus } = useSession();

  // セッションのアクセストークンをrefで保持（クロージャ問題回避）
  const accessTokenRef = useRef<string | undefined>(session?.accessToken);
  useEffect(() => {
    accessTokenRef.current = session?.accessToken;
  }, [session?.accessToken]);

  // セッションが認証済みかつトークンが存在するかチェック
  const isSessionReady =
    sessionStatus === "authenticated" && !!session?.accessToken;

  // mcp-proxy の URL を取得
  const mcpProxyUrl = getProxyServerUrl();

  // ストリーミング用のuseChat
  const { messages, status, sendMessage, setMessages } = useChat({
    id: `agent-execution-${agentId}`,
    generateId: generateCUID,
    transport: new DefaultChatTransport({
      api: `${mcpProxyUrl}/agent/${agentId}`,
      fetch: (url, options) => {
        // mcp-proxy への認証ヘッダーを追加
        const headers = new Headers(options?.headers);
        if (accessTokenRef.current) {
          headers.set("Authorization", `Bearer ${accessTokenRef.current}`);
        }
        return fetchWithErrorHandlers(url, {
          ...options,
          headers,
        });
      },
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const userText =
          lastMessage?.parts?.find((p) => p.type === "text")?.text ??
          "タスクを実行してください。";

        return {
          body: {
            organizationId,
            message: userText,
            ...request.body,
          },
        };
      },
    }),
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
