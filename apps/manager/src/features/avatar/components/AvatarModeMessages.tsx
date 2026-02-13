"use client";

/**
 * アバターモード用メッセージ表示コンポーネント
 * 半透明パネル向けのスタイリング
 * 共通のMessagePartsコンポーネントを使用
 */

import { memo, useRef, useEffect } from "react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  MessageParts,
  extractTextFromMessage,
  hasToolParts,
} from "@/components/message-parts";

type AvatarModeMessagesProps = {
  messages: Array<UIMessage>;
  isLoading: boolean;
};

/**
 * メッセージバブル（テキスト + ツール呼び出し）
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
    const hasTools = hasToolParts(message);
    const text = extractTextFromMessage(message);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex w-full flex-col gap-2"
      >
        {/* ツール呼び出しパート（共通コンポーネント使用） */}
        {hasTools && (
          <div className="flex flex-col gap-2">
            <MessageParts
              message={{
                ...message,
                parts: message.parts.filter(
                  (part) =>
                    part.type === "dynamic-tool" ||
                    part.type.startsWith("tool-") ||
                    part.type === "reasoning",
                ),
              }}
              isLoading={isLoading && isLatest}
              compact={true}
              isReadonly={true}
            />
          </div>
        )}

        {/* テキストパート */}
        {text && (
          <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                isUser
                  ? "bg-blue-500/80 text-white"
                  : "bg-white/90 text-gray-900",
                isLatest && isLoading && !isUser && "animate-pulse",
              )}
            >
              <p className="leading-relaxed break-words whitespace-pre-wrap">
                {text}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    );
  },
);

MessageBubble.displayName = "MessageBubble";

const ThinkingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex justify-start"
  >
    <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 text-sm text-gray-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>考え中...</span>
    </div>
  </motion.div>
);

const PureAvatarModeMessages = ({
  messages,
  isLoading,
}: AvatarModeMessagesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 最新5件のメッセージのみ表示
  const displayMessages = messages.slice(-5);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
    >
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

export const AvatarModeMessages = memo(PureAvatarModeMessages);
