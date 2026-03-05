"use client";

/**
 * アバター感情同期フック
 * 会話の内容に応じてアバターの表情を変化させる
 */

import { useRef, useCallback, useEffect } from "react";
import type { VRM } from "@pixiv/three-vrm";
import type { UIMessage } from "ai";

// VRM標準の表情名
type EmotionType = "neutral" | "happy" | "sad" | "angry" | "surprised" | "relaxed";

// 感情キーワードマッピング
const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  happy: [
    "嬉しい", "ありがとう", "素晴らしい", "楽しい", "良い",
    "いいね", "おめでとう", "助かり", "感謝", "はい",
    "承知", "了解", "大丈夫", "問題ない", "成功",
  ],
  surprised: [
    "驚き", "すごい", "本当", "まさか", "びっくり",
    "初めて", "新しい", "発見", "なんと", "えっ",
  ],
  sad: [
    "残念", "申し訳", "すみません", "ごめん", "困り",
    "心配", "不安", "悲しい",
  ],
  angry: [
    "エラー", "失敗", "問題", "障害", "緊急",
  ],
  relaxed: [
    "お疲れ", "ゆっくり", "休憩", "のんびり",
    "リラックス", "安心",
  ],
  neutral: [],
};

// 感情ごとの表情値
const EMOTION_EXPRESSIONS: Record<EmotionType, Record<string, number>> = {
  neutral: {},
  happy: { happy: 0.6 },
  sad: { sad: 0.4 },
  angry: { angry: 0.3 },
  surprised: { surprised: 0.5 },
  relaxed: { relaxed: 0.5 },
};

type UseEmotionSyncOptions = {
  vrm: VRM | null;
  messages: UIMessage[];
};

type UseEmotionSyncReturn = {
  /** 現在の感情 */
  currentEmotion: EmotionType;
  /** 感情を更新（アニメーションループ内で呼び出し） */
  updateEmotion: () => void;
};

/**
 * 会話内容からアバターの感情を同期するフック
 */
export const useEmotionSync = ({
  vrm,
  messages,
}: UseEmotionSyncOptions): UseEmotionSyncReturn => {
  const currentEmotionRef = useRef<EmotionType>("neutral");
  const targetEmotionRef = useRef<EmotionType>("neutral");
  const transitionProgressRef = useRef(1); // 0-1の遷移進行度

  // メッセージからの感情を検出
  useEffect(() => {
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") return;

    const text = lastMessage.parts
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text",
      )
      .map((part) => part.text)
      .join("");

    if (!text) return;

    // 最新の100文字を分析（パフォーマンス考慮）
    const recentText = text.slice(-100);

    // キーワードマッチで感情を検出
    let detectedEmotion: EmotionType = "neutral";
    let maxMatches = 0;

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      if (emotion === "neutral") continue;

      const matches = keywords.filter((keyword) =>
        recentText.includes(keyword),
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        detectedEmotion = emotion as EmotionType;
      }
    }

    // 感情が変化した場合、遷移を開始
    if (detectedEmotion !== targetEmotionRef.current) {
      targetEmotionRef.current = detectedEmotion;
      transitionProgressRef.current = 0;
    }
  }, [messages]);

  // 感情表現をスムーズに更新（アニメーションフレームごとに呼び出し）
  const updateEmotion = useCallback(() => {
    if (!vrm) return;

    const expressionManager = vrm.expressionManager;
    if (!expressionManager) return;

    // 遷移中の場合、進行度を更新
    if (transitionProgressRef.current < 1) {
      transitionProgressRef.current = Math.min(
        transitionProgressRef.current + 0.02, // 約50フレームで完了（~0.83秒）
        1,
      );
    }

    // 現在の感情と目標感情をブレンド
    const target = targetEmotionRef.current;
    const progress = transitionProgressRef.current;

    // 旧感情の表情をフェードアウト
    if (currentEmotionRef.current !== target) {
      const oldExpressions =
        EMOTION_EXPRESSIONS[currentEmotionRef.current];
      for (const [name, value] of Object.entries(oldExpressions)) {
        const currentValue = value * (1 - progress);
        expressionManager.setValue(name, currentValue);
      }

      // 遷移完了時に感情を更新
      if (progress >= 1) {
        currentEmotionRef.current = target;
      }
    }

    // 新感情の表情をフェードイン
    const newExpressions = EMOTION_EXPRESSIONS[target];
    for (const [name, value] of Object.entries(newExpressions)) {
      const targetValue = value * progress;
      expressionManager.setValue(name, targetValue);
    }
  }, [vrm]);

  return {
    currentEmotion: currentEmotionRef.current,
    updateEmotion,
  };
};
