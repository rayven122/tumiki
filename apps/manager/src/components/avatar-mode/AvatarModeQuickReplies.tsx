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

// デフォルトのクイックリプライ
const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { label: "こんにちは", message: "こんにちは！" },
  { label: "自己紹介してください", message: "自己紹介してください" },
  { label: "先端技術の展望は？", message: "先端技術の展望は？" },
  { label: "おすすめの回り方は？", message: "おすすめの回り方は？" },
  { label: "今日の予定を教えて", message: "今日の予定を教えて" },
  { label: "面白い話を聞かせて", message: "面白い話を聞かせて" },
];

type AvatarModeQuickRepliesProps = {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  setInput: (value: string) => void;
  disabled?: boolean;
  quickReplies?: QuickReply[];
};

const PureAvatarModeQuickReplies = ({
  sendMessage,
  setInput,
  disabled = false,
  quickReplies = DEFAULT_QUICK_REPLIES,
}: AvatarModeQuickRepliesProps) => {
  const handleQuickReply = (message: string) => {
    if (disabled) return;

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
