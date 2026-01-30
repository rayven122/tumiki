"use client";

/**
 * アバターモード用 TTS（テキスト読み上げ）処理フック
 * ストリーミング中のテキストを文単位で読み上げる
 */

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

type UseTTSHandlerOptions = {
  messages: UIMessage[];
  status: UseChatHelpers<ChatMessage>["status"];
  speak: (text: string) => Promise<void>;
};

/**
 * TTS処理を管理するカスタムフック
 * ストリーミング中のメッセージを文単位で読み上げ
 */
export const useTTSHandler = ({
  messages,
  status,
  speak,
}: UseTTSHandlerOptions) => {
  // speak を ref で保持（stale closure 防止）
  const speakRef = useRef(speak);
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // ストリーミング中のTTS用状態
  const streamingTextRef = useRef<string>("");
  const spokenIndexRef = useRef<number>(0);

  // ストリーミング中の status を追跡
  const prevStatusRef = useRef(status);

  // TTS: messages を監視してストリーミング中のテキストを読み上げ
  useEffect(() => {
    const lastMessage = messages.at(-1);
    if (lastMessage?.role !== "assistant") {
      return;
    }

    // メッセージからテキストを抽出
    const currentText = lastMessage.parts
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text",
      )
      .map((part) => part.text)
      .join("");

    // 安全にTTS実行するヘルパー関数
    const safeTTSSpeak = async (text: string) => {
      try {
        await speakRef.current(text);
      } catch (error) {
        // 音声合成エラーはログ出力のみで処理を継続
        console.warn("TTS音声合成エラー:", error);
      }
    };

    // ストリーミング中の場合、文単位で読み上げ
    if (status === "streaming") {
      streamingTextRef.current = currentText;

      try {
        // 文の区切り文字で分割して読み上げ
        const sentenceEndRegex = /[。！？!?]/g;
        let lastIndex = spokenIndexRef.current;
        let match: RegExpExecArray | null;

        while ((match = sentenceEndRegex.exec(currentText)) !== null) {
          if (match.index >= spokenIndexRef.current) {
            const sentence = currentText
              .slice(lastIndex, match.index + 1)
              .trim();
            if (sentence) {
              void safeTTSSpeak(sentence);
            }
            lastIndex = match.index + 1;
            spokenIndexRef.current = lastIndex;
          }
        }
      } catch (error) {
        console.error("TTS処理エラー:", error);
      }
    }

    // ストリーミング完了時、残りのテキストを読み上げ
    if (prevStatusRef.current === "streaming" && status === "ready") {
      const remainingText = streamingTextRef.current
        .slice(spokenIndexRef.current)
        .trim();
      if (remainingText) {
        void safeTTSSpeak(remainingText);
      }

      // ref をリセット
      streamingTextRef.current = "";
      spokenIndexRef.current = 0;
    }

    prevStatusRef.current = status;
  }, [messages, status]);
};
