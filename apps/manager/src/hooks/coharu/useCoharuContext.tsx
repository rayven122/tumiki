"use client";

/**
 * Coharu フック
 * VRM アバターと音声合成の状態管理
 */

import { useCallback, useRef, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { VRM } from "@pixiv/three-vrm";
import {
  coharuEnabledAtom,
  coharuVrmAtom,
  coharuSpeakingAtom,
} from "@/store/coharu";
import { SpeechQueue } from "@/lib/coharu/speechQueue";

/**
 * Coharu の状態と操作を提供するフック
 */
export const useCoharuContext = () => {
  const [isEnabled, setIsEnabled] = useAtom(coharuEnabledAtom);
  const [vrm, setVrm] = useAtom(coharuVrmAtom);
  const isSpeaking = useAtomValue(coharuSpeakingAtom);
  const setIsSpeaking = useSetAtom(coharuSpeakingAtom);

  // SpeechQueue をuseRefで管理（メモリリーク防止）
  const speechQueueRef = useRef<SpeechQueue | null>(null);

  // SpeechQueue の初期化（遅延）
  const getSpeechQueue = useCallback(() => {
    if (!speechQueueRef.current) {
      speechQueueRef.current = new SpeechQueue({
        onPlayStart: () => setIsSpeaking(true),
        onPlayEnd: () => setIsSpeaking(false),
      });
    }
    return speechQueueRef.current;
  }, [setIsSpeaking]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      speechQueueRef.current?.clear();
      speechQueueRef.current = null;
    };
  }, []);

  // リップシンク更新（話している時は固定値で口を開ける）
  const updateLipSync = useCallback(() => {
    if (!vrm) return;

    const expressionManager = vrm.expressionManager;
    if (expressionManager) {
      // 話している時は口を開ける（固定値 0.5）、話していない時は閉じる
      expressionManager.setValue("aa", isSpeaking ? 0.5 : 0);
    }
  }, [vrm, isSpeaking]);

  // テキストを音声で読み上げ
  const speak = useCallback(
    async (text: string) => {
      const queue = getSpeechQueue();
      await queue.enqueue(text);
    },
    [getSpeechQueue],
  );

  // 音声再生を停止
  const stopSpeaking = useCallback(() => {
    speechQueueRef.current?.clear();
  }, []);

  return {
    vrm,
    setVrm,
    isEnabled,
    setIsEnabled,
    isSpeaking,
    updateLipSync,
    speak,
    stopSpeaking,
  };
};

// 後方互換性のためのダミーProvider（実際には何もしない）
export const CoharuProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
