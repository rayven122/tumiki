"use client";

/**
 * アバターモード用入力コンポーネント
 * 半透明パネル向けのスタイリング
 */

import {
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

type AvatarModeInputProps = {
  input: string;
  setInput: (value: string) => void;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  chatId: string;
  orgSlug: string;
};

export const AvatarModeInput = ({
  input,
  setInput,
  sendMessage,
  status,
  stop,
  chatId,
  orgSlug,
}: AvatarModeInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "streaming";

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;

    // URLを更新（新規チャット時にIDを付与）
    window.history.replaceState({}, "", `/${orgSlug}/avatar/${chatId}`);

    void sendMessage({
      role: "user",
      parts: [{ type: "text", text: input }],
    });
    setInput("");

    // テキストエリアにフォーカスを戻す
    textareaRef.current?.focus();
  }, [input, isLoading, sendMessage, setInput, orgSlug, chatId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter で送信（Shift+Enter は改行）
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput],
  );

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3",
            "text-sm text-gray-900 placeholder:text-gray-400",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none",
            "max-h-32 min-h-[44px]",
          )}
          disabled={isLoading}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              "bg-red-500/80 text-white transition-colors hover:bg-red-600/80",
            )}
            aria-label="停止"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim()}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              "bg-blue-500/80 text-white transition-colors",
              input.trim()
                ? "hover:bg-blue-600/80"
                : "cursor-not-allowed opacity-50",
            )}
            aria-label="送信"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
