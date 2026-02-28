"use client";

/**
 * 受付モード テキスト入力コンポーネント
 * 音声が使えない来訪者向けのテキスト入力フォールバック
 */

import { useState, useCallback, useRef } from "react";
import { Send, Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

type ReceptionTextInputProps = {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  disabled?: boolean;
  chatId: string;
  orgSlug: string;
};

export const ReceptionTextInput = ({
  sendMessage,
  disabled = false,
  chatId,
  orgSlug,
}: ReceptionTextInputProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || disabled) return;

    // URLを更新
    window.history.replaceState({}, "", `/${orgSlug}/reception/${chatId}`);

    void sendMessage({
      role: "user",
      parts: [{ type: "text", text: text.trim() }],
    });
    setText("");
    setIsExpanded(false);
  }, [text, disabled, sendMessage, orgSlug, chatId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    },
    [handleSubmit],
  );

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsExpanded(true);
          // 展開後にフォーカス
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2",
          "border border-white/20 bg-black/30 backdrop-blur-md",
          "text-sm text-white/70 transition-all hover:bg-white/10",
        )}
      >
        <Keyboard className="h-4 w-4" />
        <span>テキストで入力</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-md items-center gap-2 rounded-2xl px-4 py-2",
        "border border-white/20 bg-black/40 backdrop-blur-md",
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="メッセージを入力..."
        disabled={disabled}
        className={cn(
          "flex-1 bg-transparent text-sm text-white outline-none",
          "placeholder:text-white/40",
        )}
      />

      {/* 送信ボタン */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          "transition-all",
          text.trim()
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-white/10 text-white/30",
        )}
      >
        <Send className="h-4 w-4" />
      </button>

      {/* 閉じるボタン */}
      <button
        type="button"
        onClick={() => {
          setIsExpanded(false);
          setText("");
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-all hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
