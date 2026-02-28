"use client";

/**
 * 会話連動ジェスチャーフック
 * 会話の文脈を分析して、アバターのジェスチャー（VRMAアニメーション）と
 * 表情（VRM Expression）をトリガーする
 *
 * 検出する会話意図:
 * - greeting: 挨拶（お辞儀）
 * - questioning: 質問中（手を差し出す）
 * - explaining: 説明中（ジェスチャー）
 * - acknowledging: 了解・頷き
 * - surprised: 驚き
 * - thinking: 考え中
 * - farewell: お別れ
 */

import { useEffect, useRef, useCallback } from "react";
import type { VRM } from "@pixiv/three-vrm";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

// 会話意図の種類
export type ConversationIntent =
  | "idle"
  | "greeting"
  | "questioning"
  | "explaining"
  | "acknowledging"
  | "surprised"
  | "thinking"
  | "farewell";

// 意図ごとの VRM 表情マッピング
const INTENT_EXPRESSIONS: Record<
  ConversationIntent,
  Record<string, number>
> = {
  idle: {},
  greeting: { happy: 0.5 },
  questioning: {},
  explaining: { neutral: 0 },
  acknowledging: { happy: 0.3 },
  surprised: { surprised: 0.6 },
  thinking: {},
  farewell: { happy: 0.4, sad: 0.15 },
};

// 意図ごとの検出キーワード
const INTENT_KEYWORDS: Record<
  Exclude<ConversationIntent, "idle">,
  string[]
> = {
  greeting: [
    "いらっしゃいませ",
    "こんにちは",
    "こんばんは",
    "おはよう",
    "はじめまして",
    "ようこそ",
  ],
  questioning: [
    "ですか？",
    "でしょうか？",
    "ますか？",
    "でしょう？",
    "何か",
    "どの",
    "いかが",
    "ご質問",
    "お聞き",
    "ご用件",
  ],
  explaining: [
    "について",
    "つまり",
    "具体的には",
    "例えば",
    "ご説明",
    "方法は",
    "手順",
    "まず",
    "次に",
    "ポイント",
  ],
  acknowledging: [
    "承知",
    "了解",
    "かしこまり",
    "わかりました",
    "はい",
    "そうですね",
    "その通り",
    "確かに",
  ],
  surprised: [
    "すごい",
    "驚き",
    "素晴らしい",
    "なるほど",
    "本当",
    "えっ",
    "まさか",
  ],
  thinking: [
    "少々お待ち",
    "確認",
    "調べ",
    "検索",
    "お調べ",
    "しばらく",
  ],
  farewell: [
    "ありがとうございました",
    "お気をつけて",
    "また",
    "さようなら",
    "お待ちしております",
    "失礼します",
  ],
};

// 頷きモーション用のパラメータ
type NodState = {
  active: boolean;
  progress: number; // 0-1
  speed: number;
};

type UseConversationGesturesOptions = {
  vrm: VRM | null;
  messages: UIMessage[];
  status: UseChatHelpers<ChatMessage>["status"];
  /** VRMAアニメーションを優先再生する関数 */
  playGesture: (index: number) => void;
  /** 読み込み済みアニメーション数 */
  clipCount: number;
};

type UseConversationGesturesReturn = {
  /** 現在検出されている意図 */
  currentIntent: ConversationIntent;
  /** アニメーションループ内で呼び出す更新関数 */
  updateGestures: () => void;
};

/**
 * 会話の文脈を分析してジェスチャーと表情をトリガーするフック
 */
export const useConversationGestures = ({
  vrm,
  messages,
  status,
  playGesture,
  clipCount,
}: UseConversationGesturesOptions): UseConversationGesturesReturn => {
  const currentIntentRef = useRef<ConversationIntent>("idle");
  const prevIntentRef = useRef<ConversationIntent>("idle");
  const lastProcessedMessageIdRef = useRef<string>("");

  // 頷きモーション状態
  const nodRef = useRef<NodState>({
    active: false,
    progress: 0,
    speed: 4, // 1秒に4回頷き（速い頷き）
  });

  // 瞬きモーション状態
  const blinkRef = useRef({
    nextBlinkTime: 0,
    blinkProgress: 0,
    isBlinking: false,
  });

  // 表情遷移
  const expressionTransitionRef = useRef({
    progress: 1,
    fromExpressions: {} as Record<string, number>,
    toExpressions: {} as Record<string, number>,
  });

  // テキストから意図を検出
  const detectIntent = useCallback(
    (text: string): ConversationIntent => {
      // 最新200文字を分析
      const recentText = text.slice(-200);

      let bestIntent: ConversationIntent = "idle";
      let bestScore = 0;

      for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
        const score = keywords.filter((kw) =>
          recentText.includes(kw),
        ).length;
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent as ConversationIntent;
        }
      }

      return bestIntent;
    },
    [],
  );

  // メッセージ変化時に意図を検出してジェスチャーをトリガー
  useEffect(() => {
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") return;
    if (lastMessage.id === lastProcessedMessageIdRef.current) return;

    const text = lastMessage.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join("");

    if (!text) return;

    const newIntent = detectIntent(text);

    // 意図が変化した場合のみ処理
    if (newIntent !== currentIntentRef.current && newIntent !== "idle") {
      prevIntentRef.current = currentIntentRef.current;
      currentIntentRef.current = newIntent;

      // 表情遷移を開始
      expressionTransitionRef.current = {
        progress: 0,
        fromExpressions:
          INTENT_EXPRESSIONS[prevIntentRef.current],
        toExpressions: INTENT_EXPRESSIONS[newIntent],
      };

      // 意図に応じたVRMAアニメーションをトリガー
      if (clipCount > 0) {
        // 意図をアニメーションインデックスにマッピング
        // 利用可能なクリップ数に応じて割り当て
        const intentToAnimIndex: Record<ConversationIntent, number> = {
          idle: 0,
          greeting: 0 % clipCount,
          questioning: 1 % clipCount,
          explaining: 2 % clipCount,
          acknowledging: 3 % clipCount,
          surprised: 4 % clipCount,
          thinking: 5 % clipCount,
          farewell: 6 % clipCount,
        };

        playGesture(intentToAnimIndex[newIntent]);
      }

      // 了解・挨拶時は頷きを開始
      if (newIntent === "acknowledging" || newIntent === "greeting") {
        nodRef.current = {
          active: true,
          progress: 0,
          speed: newIntent === "acknowledging" ? 5 : 3,
        };
      }
    }

    // ストリーミング完了時にメッセージIDを記録
    if (status === "ready") {
      lastProcessedMessageIdRef.current = lastMessage.id;
    }
  }, [messages, status, detectIntent, playGesture, clipCount]);

  // ストリーミング中は thinking 意図をセット
  useEffect(() => {
    if (status === "submitted") {
      currentIntentRef.current = "thinking";
      expressionTransitionRef.current = {
        progress: 0,
        fromExpressions:
          INTENT_EXPRESSIONS[prevIntentRef.current],
        toExpressions: INTENT_EXPRESSIONS.thinking,
      };
    }
  }, [status]);

  // フレームごとの更新関数
  const updateGestures = useCallback(() => {
    if (!vrm) return;
    const expressionManager = vrm.expressionManager;
    if (!expressionManager) return;

    // === 表情遷移 ===
    const transition = expressionTransitionRef.current;
    if (transition.progress < 1) {
      transition.progress = Math.min(transition.progress + 0.025, 1);
      const t = transition.progress;

      // 旧表情をフェードアウト
      for (const [name, value] of Object.entries(
        transition.fromExpressions,
      )) {
        const current = value * (1 - t);
        expressionManager.setValue(name, current);
      }

      // 新表情をフェードイン
      for (const [name, value] of Object.entries(
        transition.toExpressions,
      )) {
        const current = value * t;
        expressionManager.setValue(name, current);
      }
    }

    // === 頷きモーション ===
    const nod = nodRef.current;
    if (nod.active) {
      nod.progress += 0.016 * nod.speed; // ~60FPSで計算

      if (nod.progress >= 1) {
        // 頷き完了
        nod.active = false;
        nod.progress = 0;

        // 頭の回転をリセット
        const head = vrm.humanoid?.getNormalizedBoneNode("head");
        if (head) {
          head.rotation.x = 0;
        }
      } else {
        // sin波で頭を前後に傾ける（2回頷く）
        const angle =
          Math.sin(nod.progress * Math.PI * 4) * 0.15;
        const head = vrm.humanoid?.getNormalizedBoneNode("head");
        if (head) {
          head.rotation.x = angle;
        }
      }
    }

    // === 自然な瞬き ===
    const blink = blinkRef.current;
    const now = performance.now() / 1000;

    if (!blink.isBlinking && now > blink.nextBlinkTime) {
      // 瞬き開始（3-6秒のランダム間隔）
      blink.isBlinking = true;
      blink.blinkProgress = 0;
    }

    if (blink.isBlinking) {
      blink.blinkProgress += 0.08; // ~5フレームで完了

      if (blink.blinkProgress >= 1) {
        // 瞬き完了
        blink.isBlinking = false;
        blink.blinkProgress = 0;
        blink.nextBlinkTime = now + 3 + Math.random() * 3;
        expressionManager.setValue("blink", 0);
      } else {
        // sin波で目を閉じて開く
        const blinkValue = Math.sin(
          blink.blinkProgress * Math.PI,
        );
        expressionManager.setValue("blink", blinkValue);
      }
    }
  }, [vrm]);

  return {
    currentIntent: currentIntentRef.current,
    updateGestures,
  };
};
