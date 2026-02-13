"use client";

/**
 * アバターモード用クイックリプライコンポーネント
 * 下部に配置されるサジェスチョンボタン
 */

import { memo } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type QuickReply = {
  label: string;
  message: string;
};

// デフォルトのクイックリプライ（MCP活用を促す内容を含む）
const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { label: "今日の天気", message: "今日の天気を教えて" },
  { label: "最新ニュース", message: "今日の最新ニュースを教えて" },
  { label: "タスク確認", message: "今日のタスクを確認して" },
  { label: "ドキュメント検索", message: "関連するドキュメントを検索して" },
  { label: "スケジュール", message: "今週のスケジュールを確認して" },
  { label: "ツール一覧", message: "使えるツールの一覧を教えて" },
];

type AvatarModeQuickRepliesProps = {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  setInput: (value: string) => void;
  disabled?: boolean;
  quickReplies?: QuickReply[];
  chatId: string;
  orgSlug: string;
};

const PureAvatarModeQuickReplies = ({
  sendMessage,
  setInput,
  disabled = false,
  quickReplies = DEFAULT_QUICK_REPLIES,
  chatId,
  orgSlug,
}: AvatarModeQuickRepliesProps) => {
  const handleQuickReply = (message: string) => {
    if (disabled) return;

    // URLを更新（新規チャット時にIDを付与）
    window.history.replaceState({}, "", `/${orgSlug}/avatar/${chatId}`);

    void sendMessage({
      role: "user",
      parts: [{ type: "text", text: message }],
    });
    setInput("");
  };

  return (
    <div className="fixed right-4 bottom-4 left-[420px] z-20 md:left-[440px]">
      <div className="flex flex-wrap justify-center gap-2">
        {quickReplies.map((reply) => (
          <button
            key={reply.label}
            type="button"
            onClick={() => handleQuickReply(reply.message)}
            disabled={disabled}
            className={cn(
              "rounded-full border border-white/30 bg-white/70 px-4 py-2",
              "text-sm text-gray-800 shadow-sm backdrop-blur-md",
              "transition-all duration-200",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:border-white/50 hover:bg-white/90",
            )}
          >
            {reply.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const AvatarModeQuickReplies = memo(PureAvatarModeQuickReplies);
