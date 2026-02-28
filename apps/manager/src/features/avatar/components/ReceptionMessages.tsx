"use client";

/**
 * 受付モード メッセージ表示コンポーネント
 * 画面下部にオーバーレイ表示される会話バブル
 */

import { memo, useRef, useEffect } from "react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

type ReceptionMessagesProps = {
  messages: Array<UIMessage>;
  isLoading: boolean;
};

/**
 * メッセージバブル（テキストのみ、ツール呼び出しは非表示）
 */
const MessageBubble = memo(
  ({
    message,
    isLatest,
    isLoading,
  }: {
    message: UIMessage;
    isLatest: boolean;
    isLoading: boolean;
  }) => {
    const isUser = message.role === "user";

    // テキストパートのみ抽出
    const text = message.parts
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text",
      )
      .map((part) => part.text)
      .join("");

    if (!text) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "max-w-[80%] rounded-2xl px-5 py-3",
            isUser
              ? "bg-blue-500/80 text-white backdrop-blur-sm"
              : "border border-white/20 bg-black/40 text-white backdrop-blur-md",
            isLatest && isLoading && !isUser && "animate-pulse",
          )}
        >
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </motion.div>
    );
  },
);

MessageBubble.displayName = "ReceptionMessageBubble";

const ThinkingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex justify-start"
  >
    <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-black/40 px-5 py-3 text-sm text-white backdrop-blur-md">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>考え中...</span>
    </div>
  </motion.div>
);

const PureReceptionMessages = ({
  messages,
  isLoading,
}: ReceptionMessagesProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 最新3件のメッセージのみ表示（受付モードはシンプルに）
  const displayMessages = messages.slice(-3);

  if (displayMessages.length === 0 && !isLoading) return null;

  return (
    <div className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto px-6 py-4">
      <AnimatePresence mode="popLayout">
        {displayMessages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLatest={index === displayMessages.length - 1}
            isLoading={isLoading}
          />
        ))}

        {/* ユーザーメッセージ送信後、AIの応答待ち */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === "user" && (
            <ThinkingIndicator key="thinking" />
          )}
      </AnimatePresence>

      <div ref={endRef} className="h-1 shrink-0" />
    </div>
  );
};

export const ReceptionMessages = memo(PureReceptionMessages);
