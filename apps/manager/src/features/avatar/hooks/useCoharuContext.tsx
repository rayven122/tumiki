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
  coharuSpeechQueueAtom,
} from "@/store/coharu";
import { SpeechQueue } from "@/features/avatar/services/speechQueue";

/**
 * Coharu の状態と操作を提供するフック
 */
export const useCoharuContext = () => {
  const [isEnabled, setIsEnabled] = useAtom(coharuEnabledAtom);
  const [vrm, setVrm] = useAtom(coharuVrmAtom);
  const isSpeaking = useAtomValue(coharuSpeakingAtom);
  const setIsSpeaking = useSetAtom(coharuSpeakingAtom);
  const [speechQueue, setSpeechQueue] = useAtom(coharuSpeechQueueAtom);

  // isSpeaking を ref で保持（stale closure 防止）
  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // 口パクアニメーション用のタイムスタンプ
  const lipSyncTimeRef = useRef(0);

  // SpeechQueue の初期化（遅延）
  const getSpeechQueue = useCallback(() => {
    if (!speechQueue) {
      const newQueue = new SpeechQueue({
        onPlayStart: () => setIsSpeaking(true),
        onPlayEnd: () => setIsSpeaking(false),
      });
      setSpeechQueue(newQueue);
      return newQueue;
    }
    return speechQueue;
  }, [speechQueue, setSpeechQueue, setIsSpeaking]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      speechQueue?.clear();
    };
  }, [speechQueue]);

  // リップシンク更新（話している時は口パクアニメーション）
  const updateLipSync = useCallback(() => {
    if (!vrm) return;

    const expressionManager = vrm.expressionManager;
    if (!expressionManager) return;

    if (isSpeakingRef.current) {
      // 話している時は口パクアニメーション
      // sin波を使って口を開閉（約3Hz = 秒間3回の開閉、自然な会話速度）
      lipSyncTimeRef.current += 0.05;
      const mouthValue =
        (Math.sin(lipSyncTimeRef.current * Math.PI * 2) + 1) * 0.3 + 0.1;
      expressionManager.setValue("aa", mouthValue);
    } else {
      // 話していない時は口を閉じる
      expressionManager.setValue("aa", 0);
      lipSyncTimeRef.current = 0;
    }
  }, [vrm]);

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
    speechQueue?.clear();
  }, [speechQueue]);

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
