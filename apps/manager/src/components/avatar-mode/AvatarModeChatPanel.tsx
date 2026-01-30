"use client";

/**
 * アバターモード用チャットパネルコンポーネント
 * 左側に配置される半透明のチャットパネル
 */

import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";
import { AvatarModeMessages } from "./AvatarModeMessages";
import { AvatarModeInput } from "./AvatarModeInput";
import { McpServerSelector } from "@/components/mcp-server-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/chat/tooltip";
import { cn } from "@/lib/utils";

type AvatarModeChatPanelProps = {
  messages: Array<UIMessage>;
  input: string;
  setInput: (value: string) => void;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  className?: string;
  selectedMcpServerIds: string[];
  onMcpServerSelectionChange?: (ids: string[]) => void;
  isNewChat?: boolean;
  chatId: string;
  orgSlug: string;
};

export const AvatarModeChatPanel = ({
  messages,
  input,
  setInput,
  sendMessage,
  status,
  stop,
  className,
  selectedMcpServerIds,
  onMcpServerSelectionChange,
  isNewChat = false,
  chatId,
  orgSlug,
}: AvatarModeChatPanelProps) => {
  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div
      className={cn(
        // 位置とサイズ
        "fixed top-4 bottom-4 left-4 z-20",
        "w-80 md:w-96",
        // スタイル
        "flex flex-col overflow-hidden rounded-2xl",
        "border border-white/30 bg-white/70 shadow-lg backdrop-blur-md",
        className,
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h2 className="text-sm font-medium text-gray-900">チャット</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <McpServerSelector
                  selectedMcpServerIds={selectedMcpServerIds}
                  onSelectionChange={onMcpServerSelectionChange}
                  disabled={!isNewChat}
                />
              </div>
            </TooltipTrigger>
            {!isNewChat && (
              <TooltipContent side="bottom">
                MCPサーバーは新規チャット作成時のみ変更できます
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* メッセージエリア */}
      <AvatarModeMessages messages={messages} isLoading={isLoading} />

      {/* 入力エリア */}
      <AvatarModeInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        status={status}
        stop={stop}
        chatId={chatId}
        orgSlug={orgSlug}
      />
    </div>
  );
};
