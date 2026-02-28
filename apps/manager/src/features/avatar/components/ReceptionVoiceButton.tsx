"use client";

/**
 * 受付モード 音声入力ボタンコンポーネント
 * マイクボタンとリアルタイム音声認識テキスト表示
 */

import { useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSTT } from "@/features/avatar/hooks/useSTT";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

type ReceptionVoiceButtonProps = {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  setInput: (value: string) => void;
  disabled?: boolean;
  chatId: string;
  orgSlug: string;
};

export const ReceptionVoiceButton = ({
  sendMessage,
  setInput,
  disabled = false,
  chatId,
  orgSlug,
}: ReceptionVoiceButtonProps) => {
  // 無音タイムアウト時にメッセージを自動送信
  const handleSilenceTimeout = useCallback(
    (text: string) => {
      if (!text.trim() || disabled) return;

      // URLを更新（新規チャット時にIDを付与）
      window.history.replaceState({}, "", `/${orgSlug}/reception/${chatId}`);

      void sendMessage({
        role: "user",
        parts: [{ type: "text", text: text.trim() }],
      });
      setInput("");
    },
    [sendMessage, setInput, disabled, orgSlug, chatId],
  );

  const {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSTT({
    lang: "ja-JP",
    continuous: true,
    interimResults: true,
    silenceTimeout: 2000,
    onSilenceTimeout: handleSilenceTimeout,
  });

  // transcriptをinputに反映
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      // 残りのテキストを送信
      if (transcript.trim() && !disabled) {
        window.history.replaceState({}, "", `/${orgSlug}/reception/${chatId}`);
        void sendMessage({
          role: "user",
          parts: [{ type: "text", text: transcript.trim() }],
        });
        setInput("");
      }
      resetTranscript();
    } else {
      resetTranscript();
      startListening();
    }
  }, [
    isListening,
    transcript,
    disabled,
    startListening,
    stopListening,
    resetTranscript,
    sendMessage,
    setInput,
    orgSlug,
    chatId,
  ]);

  if (!isSupported) {
    return (
      <div className="text-center text-sm text-white/60">
        音声認識はこのブラウザではサポートされていません
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* リアルタイム認識テキスト表示 */}
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "max-w-md rounded-2xl px-6 py-3",
              "border border-white/20 bg-black/40 backdrop-blur-md",
            )}
          >
            <p className="text-center text-sm leading-relaxed text-white">
              {transcript}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* マイクボタン */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full",
            "transition-all duration-300",
            isListening
              ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
              : "bg-white/20 shadow-lg hover:bg-white/30",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label={isListening ? "音声入力を停止" : "音声入力を開始"}
        >
          {/* パルスアニメーション（認識中） */}
          {isListening && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-red-400/30" />
              <span className="absolute inset-[-8px] animate-pulse rounded-full border-2 border-red-400/40" />
            </>
          )}

          {disabled ? (
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          ) : isListening ? (
            <MicOff className="relative z-10 h-8 w-8 text-white" />
          ) : (
            <Mic className="h-8 w-8 text-white" />
          )}
        </button>

        <p className="text-sm text-white/70">
          {isListening
            ? "お話しください..."
            : disabled
              ? "応答中..."
              : "タップして話す"}
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <p className="text-center text-xs text-red-300">{error}</p>
      )}
    </div>
  );
};
